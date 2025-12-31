/**
 * ChurchTools API Types
 */

export interface CustomModule {
    id: number;
    name: string;
    shorty: string;
    description: string;
    sortKey: number;
}

export interface CustomModuleCreate {
    name: string;
    shorty: string;
    description: string;
    sortKey?: number;
}

export interface CustomModuleDataCategory {
    id: number;
    customModuleId: number;
    name: string;
    shorty: string;
    description: string;
    sortKey: number;
    data: string; // JSON string
}

export interface CustomModuleDataCategoryCreate {
    customModuleId: number;
    name: string;
    shorty: string;
    description: string;
    sortKey?: number;
}

export interface CustomModuleDataValue {
    id: number;
    dataCategoryId: number; // Note: API might return this as string or number depending on version, usually number
    sortKey: number;
    value: string; // JSON string
}

export interface CustomModuleDataValueCreate {
    dataCategoryId: number;
    value: string; // JSON string
    sortKey?: number;
}
