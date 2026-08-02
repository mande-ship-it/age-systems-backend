/**
 * System-wide permission constants for AGE Africa System
 */
const PERMISSIONS = {
    // Scholars Module
    SCHOLARS_VIEW: 'scholars.view',
    SCHOLARS_CREATE: 'scholars.create',
    SCHOLARS_EDIT: 'scholars.edit',
    SCHOLARS_DELETE: 'scholars.delete',
    SCHOLARS_APPROVE: 'scholars.approve',

    // Schools Module
    SCHOOLS_VIEW: 'schools.view',
    SCHOOLS_CREATE: 'schools.create',
    SCHOOLS_EDIT: 'schools.edit',
    SCHOOLS_DELETE: 'schools.delete',

    // Sponsors Module
    SPONSORS_VIEW: 'sponsors.view',
    SPONSORS_CREATE: 'sponsors.create',
    SPONSORS_EDIT: 'sponsors.edit',
    SPONSORS_DELETE: 'sponsors.delete',

    // Academics Module
    ACADEMICS_VIEW: 'academics.view',
    ACADEMICS_RECORD: 'academics.record',
    ACADEMICS_MANAGE: 'academics.manage',

    // Attendance Module
    ATTENDANCE_VIEW: 'attendance.view',
    ATTENDANCE_RECORD: 'attendance.record',

    // User Management
    USERS_VIEW: 'users.view',
    USERS_CREATE: 'users.create',
    USERS_EDIT: 'users.edit',
    USERS_DELETE: 'users.delete',

    // System Settings & Governance
    ROLES_MANAGE: 'roles.manage',
    DEPARTMENTS_MANAGE: 'departments.manage',
    SETTINGS_EDIT: 'settings.edit',
    BACKUP_MANAGE: 'backups.manage',
    REPORTS_VIEW: 'reports.view'
};

const PERMISSION_GROUPS = [
    {
        name: 'Scholar Management',
        permissions: [
            { id: PERMISSIONS.SCHOLARS_VIEW, label: 'View Scholars' },
            { id: PERMISSIONS.SCHOLARS_CREATE, label: 'Register Scholars' },
            { id: PERMISSIONS.SCHOLARS_EDIT, label: 'Edit Scholars' },
            { id: PERMISSIONS.SCHOLARS_DELETE, label: 'Delete Scholars' },
            { id: PERMISSIONS.SCHOLARS_APPROVE, label: 'Approve Registrations' }
        ]
    },
    {
        name: 'School Registry',
        permissions: [
            { id: PERMISSIONS.SCHOOLS_VIEW, label: 'View Schools' },
            { id: PERMISSIONS.SCHOOLS_CREATE, label: 'Register Schools' },
            { id: PERMISSIONS.SCHOOLS_EDIT, label: 'Edit Schools' },
            { id: PERMISSIONS.SCHOOLS_DELETE, label: 'Delete Schools' }
        ]
    },
    {
        name: 'Partner & Sponsor Management',
        permissions: [
            { id: PERMISSIONS.SPONSORS_VIEW, label: 'View Partners' },
            { id: PERMISSIONS.SPONSORS_CREATE, label: 'Onboard Partners' },
            { id: PERMISSIONS.SPONSORS_EDIT, label: 'Edit Partner Profiles' },
            { id: PERMISSIONS.SPONSORS_DELETE, label: 'Remove Partners' }
        ]
    },
    {
        name: 'Academic & Attendance',
        permissions: [
            { id: PERMISSIONS.ACADEMICS_VIEW, label: 'View Results' },
            { id: PERMISSIONS.ACADEMICS_RECORD, label: 'Record Marks' },
            { id: PERMISSIONS.ATTENDANCE_VIEW, label: 'View Attendance' },
            { id: PERMISSIONS.ATTENDANCE_RECORD, label: 'Record Attendance' }
        ]
    },
    {
        name: 'System Administration',
        permissions: [
            { id: PERMISSIONS.USERS_VIEW, label: 'View Users' },
            { id: PERMISSIONS.USERS_CREATE, label: 'Create Users' },
            { id: PERMISSIONS.USERS_EDIT, label: 'Modify Users' },
            { id: PERMISSIONS.USERS_DELETE, label: 'Delete Users' },
            { id: PERMISSIONS.ROLES_MANAGE, label: 'Role Architecture' },
            { id: PERMISSIONS.DEPARTMENTS_MANAGE, label: 'Department Structure' },
            { id: PERMISSIONS.BACKUP_MANAGE, label: 'Disaster Recovery' }
        ]
    }
];

module.exports = {
    PERMISSIONS,
    PERMISSION_GROUPS
};
