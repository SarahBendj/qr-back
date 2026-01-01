import { SetMetadata } from '@nestjs/common';

export const API_KEY_METADATA = 'apiKeyConfig';

export interface ApiKeyConfig {
  table: string;         // nom de la table
  field: string;         // champ contenant le hash
  lookup: string[];      // paramètres utilisés pour retrouver la ressource (slug, id…)
}

export const ApiKeyProtected = (config: ApiKeyConfig) =>
  SetMetadata(API_KEY_METADATA, config);
