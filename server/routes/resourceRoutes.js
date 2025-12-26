const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticate, authorizeRole, optionalAuthenticate } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

const resourceController = require('../controllers-sql/resourceController');
const resourceTypeController = require('../controllers-sql/resourceTypeController');

const router = express.Router();

// -------------------- Resource Types --------------------
router.get('/types', optionalAuthenticate, resourceTypeController.listResourceTypes);
router.get('/types/:typeId', optionalAuthenticate, param('typeId').isInt(), validateRequest, resourceTypeController.getResourceType);
// only admin can create/update types
router.post('/types', authenticate, authorizeRole('admin'), [body('name').isString().trim().notEmpty(), body('description').optional().isString()], validateRequest, resourceTypeController.createResourceType);
router.patch('/types/:typeId', authenticate, authorizeRole('admin'), [param('typeId').isInt(), body('name').optional().isString(), body('description').optional().isString()], validateRequest, resourceTypeController.updateResourceType);

// -------------------- Resources --------------------
router.get('/', optionalAuthenticate, query('search').optional().isString(), validateRequest, resourceController.listResources);
router.post('/', authenticate, authorizeRole(['admin','staff']), [
  body('resourceTypeId').optional().isInt(),
  body('name').isString().trim().notEmpty(),
  body('assetTag').optional().isString(),
  body('serialNumber').optional().isString(),
  body('ownerId').optional().isInt(),
  body('department').optional().isString(),
  body('status').optional().isIn(['available','allocated','maintenance','retired']),
], validateRequest, resourceController.createResource);

router.get('/:resourceId', optionalAuthenticate, param('resourceId').isInt(), validateRequest, resourceController.getResource);
router.patch('/:resourceId', authenticate, authorizeRole(['admin','staff']), [param('resourceId').isInt()], validateRequest, resourceController.updateResource);
router.delete('/:resourceId', authenticate, authorizeRole('admin'), param('resourceId').isInt(), validateRequest, resourceController.deleteResource);

module.exports = router;
