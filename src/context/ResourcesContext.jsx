import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { resourcesApi, allocationsApi } from '../utils/api';

export const ResourcesContext = createContext();

export const ResourcesProvider = ({ children }) => {
  const { user } = useAuth();

  const [resources, setResources] = useState([]);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all resources
  const fetchResources = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      const res = await resourcesApi.getResources({ search: searchQuery });
      if (res.data.success) {
        setResources(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch resources', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch resource types
  const fetchResourceTypes = useCallback(async () => {
    try {
      const res = await resourcesApi.getResourceTypes();
      if (res.data.success) {
        setResourceTypes(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch resource types', err);
    }
  }, []);

  // Fetch allocations
  const fetchAllocations = useCallback(async (params = {}) => {
    try {
      const res = await allocationsApi.getAllocations(params);
      if (res.data.success) {
        setAllocations(res.data.data);
      }
      return res.data.data;
    } catch (err) {
      console.error('Failed to fetch allocations', err);
      return [];
    }
  }, []);

  // Create a new resource (staff/admin only)
  const createResource = useCallback(async (data) => {
    try {
      const res = await resourcesApi.createResource(data);
      if (res.data.success) {
        await fetchResources();
        return res.data.data;
      }
    } catch (err) {
      console.error('Failed to create resource', err);
      throw err;
    }
  }, [fetchResources]);

  // Update a resource (staff/admin only)
  const updateResource = useCallback(async (resourceId, data) => {
    try {
      const res = await resourcesApi.updateResource(resourceId, data);
      if (res.data.success) {
        await fetchResources();
        return res.data.data;
      }
    } catch (err) {
      console.error('Failed to update resource', err);
      throw err;
    }
  }, [fetchResources]);

  // Delete a resource (admin only)
  const deleteResource = useCallback(async (resourceId) => {
    try {
      await resourcesApi.deleteResource(resourceId);
      await fetchResources();
    } catch (err) {
      console.error('Failed to delete resource', err);
      throw err;
    }
  }, [fetchResources]);

  // Create a resource allocation/reservation (staff/admin only)
  const createAllocation = useCallback(async (data) => {
    try {
      const res = await allocationsApi.createAllocation(data);
      if (res.data.success) {
        await fetchAllocations();
        await fetchResources(); // Update resource status
        return res.data.data;
      }
    } catch (err) {
      console.error('Failed to create allocation', err);
      throw err;
    }
  }, [fetchAllocations, fetchResources]);

  // Return a resource allocation (staff/admin only)
  const returnAllocation = useCallback(async (allocationId) => {
    try {
      const res = await allocationsApi.updateAllocation(allocationId, { status: 'returned', returnedAt: new Date().toISOString() });
      if (res.data.success) {
        await fetchAllocations();
        await fetchResources(); // Update resource status
        return res.data.data;
      }
    } catch (err) {
      console.error('Failed to return allocation', err);
      throw err;
    }
  }, [fetchAllocations, fetchResources]);

  // Get available resources for students to reserve
  const availableResources = useMemo(() => {
    return resources.filter(r => r.status === 'available');
  }, [resources]);

  // Get my allocations (for students)
  const myAllocations = useMemo(() => {
    if (!user) return [];
    return allocations.filter(a => String(a.allocated_to_user_id) === String(user.id || user._id));
  }, [allocations, user]);

  // Load initial data
  useEffect(() => {
    fetchResources();
    fetchResourceTypes();
  }, [fetchResources, fetchResourceTypes]);

  // Load allocations for logged-in users
  useEffect(() => {
    if (user) {
      fetchAllocations({ userId: user.id || user._id });
    }
  }, [user, fetchAllocations]);

  const value = {
    resources,
    resourceTypes,
    allocations,
    loading,
    availableResources,
    myAllocations,
    fetchResources,
    fetchResourceTypes,
    fetchAllocations,
    createResource,
    updateResource,
    deleteResource,
    createAllocation,
    returnAllocation,
  };

  return <ResourcesContext.Provider value={value}>{children}</ResourcesContext.Provider>;
};

export const useResources = () => {
  const ctx = React.useContext(ResourcesContext);
  if (!ctx) throw new Error('useResources must be used within ResourcesProvider');
  return ctx;
};
