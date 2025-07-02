/**
 * Base interface for domain models to ensure they have toPersistence method
 */
export interface IDomainModel<TPersistence> {
  id: string;
  toPersistence(): TPersistence;
}