/**
 * Test Fixtures
 * Sample data for testing
 */

export const sampleTimeEntry = {
    id: '1',
    userId: 123,
    categoryId: 'work',
    categoryName: 'Office Work',
    startTime: '2024-01-15T09:00:00.000Z',
    endTime: '2024-01-15T17:00:00.000Z',
    duration: 480,
    description: 'Daily work',
    isBreak: false,
};

export const sampleTimeEntries = [
    sampleTimeEntry,
    {
        id: '2',
        userId: 123,
        categoryId: 'meeting',
        categoryName: 'Meetings',
        startTime: '2024-01-16T10:00:00.000Z',
        endTime: '2024-01-16T11:30:00.000Z',
        duration: 90,
        description: 'Team meeting',
        isBreak: false,
    },
];

export const sampleCategory = {
    id: 'work',
    name: 'Office Work',
    color: '#4CAF50',
};

export const sampleCategories = [
    sampleCategory,
    {
        id: 'meeting',
        name: 'Meetings',
        color: '#2196F3',
    },
    {
        id: 'break',
        name: 'Break',
        color: '#FFC107',
    },
];

export const sampleSettings = {
    schemaVersion: 2,
    hoursPerWeek: 40,
    hoursPerDay: 8,
    workWeekDays: [1, 2, 3, 4, 5],
    employeeGroupId: 10,
    volunteerGroupId: 11,
    hrGroupId: 12,
    managerGroupId: 13,
    workCategories: sampleCategories,
    userHoursConfig: [
        {
            userId: 123,
            name: 'John Doe',
            hoursPerWeek: 40,
            hoursPerDay: 8,
            workWeekDays: [1, 2, 3, 4, 5],
            inactive: false,
        },
    ],
    excelImportEnabled: true,
    managerAssignments: [
        {
            managerId: 456,
            managerName: 'Jane Manager',
            employeeIds: [123, 789],
        },
    ],
};

export const sampleUsers = [
    {
        id: 123,
        firstName: 'John',
        lastName: 'Doe',
    },
    {
        id: 456,
        firstName: 'Jane',
        lastName: 'Manager',
    },
];

export const sampleTranslations = {
    en: {
        'test.key': 'Test Value',
        'test.with.param': 'Hello {name}',
    },
    de: {
        'test.key': 'Testwert',
        'test.with.param': 'Hallo {name}',
    },
};
