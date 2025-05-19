// Jest setup file
import { jest } from '@jest/globals';

// Make jest.mocked work correctly
declare global {
  namespace jest {
    function mocked<T>(item: T): jest.MockedObject<T>;
  }
}