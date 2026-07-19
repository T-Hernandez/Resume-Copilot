import { Recommendation } from '../value-objects/recommendation';
import { RecommendationInput } from './build-recommendation-input';

// Port only - per 01-domain/README.md ("No depender de librerias externas
// ... Implementaciones pertenecen a la capa de infrastructure"), the actual
// LLM call cannot live in this file or anywhere under 01-domain. This
// interface is the contract an infrastructure-layer adapter must satisfy;
// the domain depends on this abstraction, never on a concrete LLM SDK.
//
// Per ADR-001 and Ubiquitous-Language.md (GenerateRecommendations is listed
// under "Aplicacion / Presentacion (externo a dominio)"): an implementation
// of this interface may phrase/prioritize/summarize the RecommendationInput
// it's given, but must never invent a fact that isn't already present in
// it - no new scores, no new matched/unmatched claims, nothing the
// deterministic pipeline didn't already decide.
export interface RecommendationGenerator {
  generate(input: RecommendationInput): Promise<Recommendation[]>;
}
