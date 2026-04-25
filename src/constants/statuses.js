// Status constants for consistent status management
// Use these throughout the application for status validation and display

// Standard status values (as stored in database)
const STATUSES = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  APPROVED: 'APPROVED',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED',
  ARCHIVED: 'ARCHIVED',
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PROCESSING: 'PROCESSING',
  UNDER_REVIEW: 'UNDER_REVIEW'
};

// Status display names (for UI)
const STATUS_DISPLAY_NAMES = {
  [STATUSES.ACTIVE]: 'Active',
  [STATUSES.INACTIVE]: 'Inactive',
  [STATUSES.PENDING]: 'Pending',
  [STATUSES.REJECTED]: 'Rejected',
  [STATUSES.APPROVED]: 'Approved',
  [STATUSES.SUSPENDED]: 'Suspended',
  [STATUSES.DELETED]: 'Deleted',
  [STATUSES.ARCHIVED]: 'Archived',
  [STATUSES.DRAFT]: 'Draft',
  [STATUSES.PUBLISHED]: 'Published',
  [STATUSES.EXPIRED]: 'Expired',
  [STATUSES.CANCELLED]: 'Cancelled',
  [STATUSES.COMPLETED]: 'Completed',
  [STATUSES.FAILED]: 'Failed',
  [STATUSES.PROCESSING]: 'Processing',
  [STATUSES.UNDER_REVIEW]: 'Under Review'
};

// Status colors for UI (optional)
const STATUS_COLORS = {
  [STATUSES.ACTIVE]: '#10b981',     // green
  [STATUSES.INACTIVE]: '#6b7280',   // gray
  [STATUSES.PENDING]: '#f59e0b',     // amber
  [STATUSES.REJECTED]: '#ef4444',     // red
  [STATUSES.APPROVED]: '#10b981',    // green
  [STATUSES.SUSPENDED]: '#f97316',   // orange
  [STATUSES.DELETED]: '#ef4444',     // red
  [STATUSES.ARCHIVED]: '#6b7280',    // gray
  [STATUSES.DRAFT]: '#6b7280',       // gray
  [STATUSES.PUBLISHED]: '#10b981',  // green
  [STATUSES.EXPIRED]: '#ef4444',     // red
  [STATUSES.CANCELLED]: '#6b7280',   // gray
  [STATUSES.COMPLETED]: '#10b981',  // green
  [STATUSES.FAILED]: '#ef4444',      // red
  [STATUSES.PROCESSING]: '#3b82f6',  // blue
  [STATUSES.UNDER_REVIEW]: '#f59e0b' // amber
};

// Status groups for filtering and logic
const STATUS_GROUPS = {
  ACTIVE_STATUSES: [STATUSES.ACTIVE, STATUSES.APPROVED, STATUSES.PUBLISHED, STATUSES.COMPLETED],
  INACTIVE_STATUSES: [STATUSES.INACTIVE, STATUSES.SUSPENDED, STATUSES.DELETED, STATUSES.ARCHIVED, STATUSES.EXPIRED, STATUSES.CANCELLED],
  PENDING_STATUSES: [STATUSES.PENDING, STATUSES.PROCESSING, STATUSES.UNDER_REVIEW],
  FINAL_STATUSES: [STATUSES.COMPLETED, STATUSES.FAILED, STATUSES.CANCELLED, STATUSES.DELETED],
  TEMPORARY_STATUSES: [STATUSES.DRAFT, STATUSES.PENDING, STATUSES.PROCESSING, STATUSES.UNDER_REVIEW]
};

// Status descriptions
const STATUS_DESCRIPTIONS = {
  [STATUSES.ACTIVE]: 'Currently active and functional',
  [STATUSES.INACTIVE]: 'Temporarily inactive',
  [STATUSES.PENDING]: 'Awaiting review or action',
  [STATUSES.REJECTED]: 'Not approved or denied',
  [STATUSES.APPROVED]: 'Approved and ready',
  [STATUSES.SUSPENDED]: 'Temporarily suspended',
  [STATUSES.DELETED]: 'Permanently deleted',
  [STATUSES.ARCHIVED]: 'Archived for reference',
  [STATUSES.DRAFT]: 'Draft version not yet submitted',
  [STATUSES.PUBLISHED]: 'Published and visible',
  [STATUSES.EXPIRED]: 'Past expiration date',
  [STATUSES.CANCELLED]: 'Cancelled by user',
  [STATUSES.COMPLETED]: 'Successfully completed',
  [STATUSES.FAILED]: 'Failed to complete',
  [STATUSES.PROCESSING]: 'Currently being processed',
  [STATUSES.UNDER_REVIEW]: 'Under review by authority'
};

// Helper functions
const getStatusDisplayName = (status) => {
  return STATUS_DISPLAY_NAMES[status] || status;
};

const getStatusColor = (status) => {
  return STATUS_COLORS[status] || '#6b7280'; // gray default
};

const getStatusDescription = (status) => {
  return STATUS_DESCRIPTIONS[status] || 'No description available';
};

const isValidStatus = (status) => {
  return Object.values(STATUSES).includes(status);
};

const getStatusOptions = () => {
  return Object.values(STATUSES).map(status => ({
    value: status,
    label: STATUS_DISPLAY_NAMES[status],
    description: STATUS_DESCRIPTIONS[status],
    color: STATUS_COLORS[status],
    group: getStatusGroup(status)
  }));
};

const getStatusGroup = (status) => {
  for (const [groupName, statusList] of Object.entries(STATUS_GROUPS)) {
    if (statusList.includes(status)) {
      return groupName;
    }
  }
  return 'OTHER';
};

const isActiveStatus = (status) => {
  return STATUS_GROUPS.ACTIVE_STATUSES.includes(status);
};

const isInactiveStatus = (status) => {
  return STATUS_GROUPS.INACTIVE_STATUSES.includes(status);
};

const isPendingStatus = (status) => {
  return STATUS_GROUPS.PENDING_STATUSES.includes(status);
};

const isFinalStatus = (status) => {
  return STATUS_GROUPS.FINAL_STATUSES.includes(status);
};

const canTransitionTo = (currentStatus, newStatus) => {
  // Define business rules for status transitions
  const transitions = {
    [STATUSES.DRAFT]: [STATUSES.PENDING, STATUSES.ACTIVE, STATUSES.DELETED],
    [STATUSES.PENDING]: [STATUSES.APPROVED, STATUSES.REJECTED, STATUSES.CANCELLED],
    [STATUSES.APPROVED]: [STATUSES.ACTIVE, STATUSES.REJECTED, STATUSES.CANCELLED],
    [STATUSES.ACTIVE]: [STATUSES.INACTIVE, STATUSES.SUSPENDED, STATUSES.DELETED],
    [STATUSES.INACTIVE]: [STATUSES.ACTIVE, STATUSES.DELETED],
    [STATUSES.SUSPENDED]: [STATUSES.ACTIVE, STATUSES.DELETED],
    [STATUSES.REJECTED]: [STATUSES.DRAFT, STATUSES.PENDING],
    [STATUSES.CANCELLED]: [STATUSES.DRAFT],
    [STATUSES.PROCESSING]: [STATUSES.COMPLETED, STATUSES.FAILED, STATUSES.CANCELLED],
    [STATUSES.COMPLETED]: [STATUSES.ARCHIVED],
    [STATUSES.FAILED]: [STATUSES.DRAFT, STATUSES.PENDING],
    [STATUSES.UNDER_REVIEW]: [STATUSES.APPROVED, STATUSES.REJECTED]
  };
  
  return transitions[currentStatus]?.includes(newStatus) || false;
};

module.exports = {
  STATUSES,
  STATUS_DISPLAY_NAMES,
  STATUS_COLORS,
  STATUS_GROUPS,
  STATUS_DESCRIPTIONS,
  getStatusDisplayName,
  getStatusColor,
  getStatusDescription,
  isValidStatus,
  getStatusOptions,
  getStatusGroup,
  isActiveStatus,
  isInactiveStatus,
  isPendingStatus,
  isFinalStatus,
  canTransitionTo
};
