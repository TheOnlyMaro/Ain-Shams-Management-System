const { pool } = require('../db/sql');

// Helper to wrap DB queries for better error handling/logging
const dbQuery = async (text, params) => {
  return await pool.query(text, params);
};

// =========================================================================
// PROFESSOR/STAFF ACTIONS
// =========================================================================

exports.createQuiz = async (req, res) => {
  const client = await pool.connect();
  try {
    const { courseId, title, description, dueDate, timeLimitMinutes, questions } = req.body;
    const userId = req.user.userId; // From authMiddleware

    if (!courseId || !title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Missing required fields or invalid questions format.' });
    }

    await client.query('BEGIN');

    // 1. Create Quiz Header
    const quizInsertQuery = `
      INSERT INTO quizzes (course_id, creator_id, title, description, due_date, time_limit_minutes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const quizRes = await client.query(quizInsertQuery, [
      courseId, userId, title, description || '', dueDate || null, timeLimitMinutes || null
    ]);
    const quizId = quizRes.rows[0].id;

    // 2. Insert Questions
    const questionInsertQuery = `
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, correct_answer, points, order_index)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    let order = 0;
    for (const q of questions) {
      // Basic validation per question
      if (!q.questionText || !q.questionType) continue; 
      
      const optionsJson = q.options ? JSON.stringify(q.options) : '[]';
      await client.query(questionInsertQuery, [
        quizId,
        q.questionText,
        q.questionType, // 'mcq' or 'short_answer'
        optionsJson,
        q.correctAnswer || '',
        q.points || 1,
        order++
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Quiz created successfully', quizId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating quiz:', error);
    res.status(500).json({ message: 'Server error creating quiz' });
  } finally {
    client.release();
  }
};

exports.getQuizzesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Only return high-level info. 
    // If student, maybe check if they submitted? (Optimization for later)
    const result = await dbQuery(`
      SELECT q.*, u.name as creator_name,
             (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count
      FROM quizzes q
      LEFT JOIN users u ON q.creator_id = u.id
      WHERE q.course_id = $1
      ORDER BY q.created_at DESC
    `, [courseId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: 'Server error fetching quizzes' });
  }
};

exports.getQuizDetails = async (req, res) => {
  try {
    const { quizId } = req.params;
    
    // Get header
    const quizRes = await dbQuery('SELECT * FROM quizzes WHERE id = $1', [quizId]);
    if (quizRes.rows.length === 0) return res.status(404).json({ message: 'Quiz not found' });
    const quiz = quizRes.rows[0];

    // Get questions
    // NOTE: For students, we might want to hide correct_answer!
    // But for now verify based on role if needed. Assuming this is for taking the quiz:
    // If it's a student taking it, we should NOT send correct_answer.
    const isStudent = req.user.role === 'student';
    
    let questionColumnSelection = 'id, quiz_id, question_text, question_type, options, points, order_index';
    if (!isStudent) {
      questionColumnSelection += ', correct_answer';
    }

    const questionsRes = await dbQuery(`
      SELECT ${questionColumnSelection}
      FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY order_index ASC
    `, [quizId]);

    res.json({ ...quiz, questions: questionsRes.rows });

  } catch (error) {
    console.error('Error fetching quiz details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// =========================================================================
// STUDENT ACTIONS
// =========================================================================

exports.startQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const studentId = req.user.userId;

    // Check if already exists
    const existing = await dbQuery(
      'SELECT id FROM quiz_submissions WHERE quiz_id = $1 AND student_id = $2',
      [quizId, studentId]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({ message: 'Quiz already started', submissionId: existing.rows[0].id });
    }

    // Create new submission
    const result = await dbQuery(
      'INSERT INTO quiz_submissions (quiz_id, student_id) VALUES ($1, $2) RETURNING id',
      [quizId, studentId]
    );

    res.status(201).json({ message: 'Quiz started', submissionId: result.rows[0].id });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ message: 'Server error starting quiz' });
  }
};

exports.submitQuiz = async (req, res) => {
  const client = await pool.connect();
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // Array of { questionId, answerText }
    const studentId = req.user.userId;

    // 1. Get submission record
    const subRes = await client.query(
      'SELECT id FROM quiz_submissions WHERE quiz_id = $1 AND student_id = $2', 
      [quizId, studentId]
    );
    if (subRes.rows.length === 0) {
      return res.status(404).json({ message: 'No active submission found. Start quiz first.' });
    }
    const submissionId = subRes.rows[0].id;

    await client.query('BEGIN');

    // 2. Fetch all questions and correct answers for grading
    const qRes = await client.query(
      'SELECT id, question_type, correct_answer, points FROM quiz_questions WHERE quiz_id = $1',
      [quizId]
    );
    const questionsMap = new Map();
    qRes.rows.forEach(q => questionsMap.set(q.id, q));

    let totalScore = 0;

    // 3. Process answers
    // Clear previous answers if any (allow re-submission logic? usually ONE submission, but let's be safe: upsert or delete-insert)
    // Here we'll just delete previous answers for this submission to be clean
    await client.query('DELETE FROM quiz_answers WHERE submission_id = $1', [submissionId]);

    const answerInsertQuery = `
      INSERT INTO quiz_answers (submission_id, question_id, answer_text, is_correct, points_awarded)
      VALUES ($1, $2, $3, $4, $5)
    `;

    for (const ans of answers) {
      const q = questionsMap.get(ans.questionId);
      if (!q) continue;

      let isCorrect = false;
      let pointsAwarded = 0;

      // Simple Auto-grading for MCQ
      if (q.question_type === 'mcq') {
        // Case-sensitive exact match? Or trim? Let's trim.
        const studentAns = (ans.answerText || '').trim();
        const correctAns = (q.correct_answer || '').trim();
        if (studentAns === correctAns) {
          isCorrect = true;
          pointsAwarded = q.points;
        }
      } 
      // Manual grading for short_answer usually, or exact match if specific. 
      // Let's assume manual for short_answer for now unless exact match.
      // Implementing simple exact match for short_answer acts as auto-grade too.
      else if (q.question_type === 'short_answer') {
         if (q.correct_answer && (ans.answerText || '').trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
             isCorrect = true;
             pointsAwarded = q.points;
         }
      }

      totalScore += pointsAwarded;

      await client.query(answerInsertQuery, [
        submissionId,
        ans.questionId,
        ans.answerText,
        isCorrect,
        pointsAwarded
      ]);
    }

    // 4. Update Submission with Score and Date
    await client.query(
      'UPDATE quiz_submissions SET submitted_at = CURRENT_TIMESTAMP, score = $1 WHERE id = $2',
      [totalScore, submissionId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Quiz submitted successfully', score: totalScore });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Server error submitting quiz' });
  } finally {
    client.release();
  }
};

exports.getStudentResult = async (req, res) => {
  try {
    const { quizId } = req.params;
    const studentId = req.user.userId;

    // Get submission
    const subRes = await dbQuery(
      `SELECT * FROM quiz_submissions WHERE quiz_id = $1 AND student_id = $2`,
      [quizId, studentId]
    );
    if (subRes.rows.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    const submission = subRes.rows[0];

    // Get answers with question details
    const ansRes = await dbQuery(`
      SELECT qa.*, qq.question_text, qq.question_type, qq.points as max_points
      FROM quiz_answers qa
      JOIN quiz_questions qq ON qa.question_id = qq.id
      WHERE qa.submission_id = $1
    `, [submission.id]);

    res.json({ submission, answers: ansRes.rows });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
