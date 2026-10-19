declare global {
  namespace App {
    interface Locals {
      student: import('./lib/server/learning/contracts').StudentIdentity | null;
      sessionUnavailable: boolean;
      teacher: { id: string } | null;
    }
  }
}
export {};
