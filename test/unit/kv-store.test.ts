import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
    getCustomDataValues,
    createCustomDataValue,
    updateCustomDataValue,
    deleteCustomDataValue,
} from '../../src/services/kv-store';
import {
    mockChurchtoolsClient,
    resetMocks,
    mockGetCustomDataValues,
    mockCreateCustomDataValue,
    mockUpdateCustomDataValue,
    mockDeleteCustomDataValue,
} from '../helpers/mocks';
import {
    sampleCustomDataValues,
    // sampleParsedDataValue,
    // sampleCustomDataValue,
} from '../fixtures/sample-data';

// Mock getModule function from kv-store
vi.mock('../../src/services/kv-store', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/services/kv-store')>();
    return {
        ...actual,
        getModule: vi.fn().mockResolvedValue({ id: 14, shorty: 'timetracker' }),
    };
});

describe('kv-store', () => {
    beforeEach(() => {
        resetMocks();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getCustomDataValues', () => {
        it('should successfully fetch and parse custom data values', async () => {
            mockGetCustomDataValues(sampleCustomDataValues);

            const result = await getCustomDataValues(10, 14);

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                userId: 123,
                categoryId: 'work',
                id: 1,
                dataCategoryId: 10,
            });
            expect(mockChurchtoolsClient.get).toHaveBeenCalledWith(
                '/custommodules/14/customdatacategories/10/customdatavalues'
            );
        });

        it('should return empty array when no data values exist', async () => {
            mockGetCustomDataValues([]);

            const result = await getCustomDataValues(10, 14);

            expect(result).toEqual([]);
            expect(result).toHaveLength(0);
        });

        it('should throw error when value field is null', async () => {
            const invalidData = [
                {
                    id: 1,
                    dataCategoryId: 10,
                    value: null,
                },
            ];
            mockGetCustomDataValues(invalidData);

            await expect(getCustomDataValues(10, 14)).rejects.toThrow(
                "Custom data value 1 has null or undefined 'value' field"
            );
        });

        it('should handle API errors', async () => {
            mockChurchtoolsClient.get.mockRejectedValue(new Error('API Error'));

            await expect(getCustomDataValues(10, 14)).rejects.toThrow('API Error');
        });
    });

    describe('createCustomDataValue', () => {
        it('should successfully create a custom data value', async () => {
            const payload = {
                dataCategoryId: 10,
                value: JSON.stringify({ test: 'data' }),
            };
            mockCreateCustomDataValue('created-id');

            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await createCustomDataValue(payload, 14);

            expect(mockChurchtoolsClient.post).toHaveBeenCalledWith(
                '/custommodules/14/customdatacategories/10/customdatavalues',
                payload
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                'Created data value in category 10:',
                'created-id'
            );

            consoleSpy.mockRestore();
        });

        it('should log creation message', async () => {
            const payload = {
                dataCategoryId: 10,
                value: JSON.stringify({ test: 'data' }),
            };
            mockCreateCustomDataValue();

            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await createCustomDataValue(payload, 14);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should handle API errors', async () => {
            const payload = {
                dataCategoryId: 10,
                value: JSON.stringify({ test: 'data' }),
            };
            mockChurchtoolsClient.post.mockRejectedValue(new Error('Create failed'));

            await expect(createCustomDataValue(payload, 14)).rejects.toThrow('Create failed');
        });
    });

    describe('updateCustomDataValue', () => {
        it('should successfully update a custom data value', async () => {
            const payload = { value: JSON.stringify({ updated: true }) };
            const updatedValue = { id: 1, dataCategoryId: 10, ...payload };
            mockUpdateCustomDataValue(updatedValue);

            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await updateCustomDataValue(10, 1, payload, 14);

            expect(mockChurchtoolsClient.put).toHaveBeenCalledWith(
                '/custommodules/14/customdatacategories/10/customdatavalues/1',
                payload
            );
            expect(consoleSpy).toHaveBeenCalledWith(
                'Updated data value 1 in category 10:',
                updatedValue
            );

            consoleSpy.mockRestore();
        });

        it('should log update message', async () => {
            const payload = { value: JSON.stringify({ test: 'data' }) };
            mockUpdateCustomDataValue({});

            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await updateCustomDataValue(10, 1, payload, 14);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should handle API errors', async () => {
            const payload = { value: JSON.stringify({ test: 'data' }) };
            mockChurchtoolsClient.put.mockRejectedValue(new Error('Update failed'));

            await expect(updateCustomDataValue(10, 1, payload, 14)).rejects.toThrow(
                'Update failed'
            );
        });
    });

    describe('deleteCustomDataValue', () => {
        it('should successfully delete a custom data value', async () => {
            mockDeleteCustomDataValue();

            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await deleteCustomDataValue(10, 1, 14);

            expect(mockChurchtoolsClient.deleteApi).toHaveBeenCalledWith(
                '/custommodules/14/customdatacategories/10/customdatavalues/1'
            );
            expect(consoleSpy).toHaveBeenCalledWith('Deleted data value 1 from category 10');

            consoleSpy.mockRestore();
        });

        it('should log deletion message', async () => {
            mockDeleteCustomDataValue();

            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            await deleteCustomDataValue(10, 1, 14);

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should handle API errors', async () => {
            mockChurchtoolsClient.deleteApi.mockRejectedValue(new Error('Delete failed'));

            await expect(deleteCustomDataValue(10, 1, 14)).rejects.toThrow('Delete failed');
        });
    });
});
