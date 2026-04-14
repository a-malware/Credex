/**
 * Program IDL type definition
 * This file provides TypeScript types for the ColdStart-PoR program
 */

export type ColdstartPor = {
  address: string;
  metadata: {
    name: string;
    version: string;
    spec: string;
  };
  instructions: Array<any>;
  accounts: Array<any>;
  events: Array<any>;
  errors: Array<any>;
  types: Array<any>;
};
