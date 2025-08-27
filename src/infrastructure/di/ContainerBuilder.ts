import { Container, ServiceKeys } from './Container.js';
import { SafetyEvaluationServiceImpl } from '../../domain/services/impl/SafetyEvaluationServiceImpl.js';
import { BrandComplianceServiceImpl } from '../../domain/services/impl/BrandComplianceServiceImpl.js';
import { CheckSafetyUseCase } from '../../application/use-cases/CheckSafetyUseCase.js';
import { CheckComplianceUseCase } from '../../application/use-cases/CheckComplianceUseCase.js';
import { CombinedEvaluationUseCase } from '../../application/use-cases/CombinedEvaluationUseCase.js';
import { UpdateConfigUseCase } from '../../application/use-cases/UpdateConfigUseCase.js';
import { BatchEvaluationUseCase } from '../../application/use-cases/BatchEvaluationUseCase.js';
import { SafetyResponseFormatter } from '../../adapters/primary/mcp/formatters/SafetyResponseFormatter.js';
import { ComplianceResponseFormatter } from '../../adapters/primary/mcp/formatters/ComplianceResponseFormatter.js';
import { CombinedResponseFormatter } from '../../adapters/primary/mcp/formatters/CombinedResponseFormatter.js';
import { BatchResponseFormatter } from '../../adapters/primary/mcp/formatters/BatchResponseFormatter.js';
import { McpRequestValidator } from '../../adapters/primary/mcp/validators/McpRequestValidator.js';
import { McpServerAdapter } from '../../adapters/primary/mcp/McpServerAdapter.js';
import { FileBrandSchemaRepository } from '../../adapters/secondary/configuration/FileBrandSchemaRepository.js';
import { InMemoryCacheRepository } from '../../adapters/secondary/caching/InMemoryCacheRepository.js';
import { DEFAULT_BRAND_SAFETY_CONFIG } from '../../types/brandSafety.js';
import { MultiLanguageAnalyzer } from '../../domain/services/impl/MultiLanguageAnalyzer.js';
import { ConfidenceScorer } from '../../domain/services/impl/ConfidenceScorer.js';
import { EvaluationExplainer } from '../../domain/services/impl/EvaluationExplainer.js';
import { RecommendationEngine } from '../../domain/services/impl/RecommendationEngine.js';

/**
 * Builds and configures the dependency injection container
 */
export class ContainerBuilder {
  
  static async build(): Promise<Container> {
    const container = new Container();
    
    // Register repositories
    container.registerSingleton(
      ServiceKeys.BRAND_SCHEMA_REPOSITORY,
      new FileBrandSchemaRepository()
    );
    
    container.registerSingleton(
      ServiceKeys.CACHE_REPOSITORY,
      new InMemoryCacheRepository()
    );
    
    // Register domain services
    container.registerFactory(ServiceKeys.SAFETY_EVALUATION_SERVICE, () => {
      return new SafetyEvaluationServiceImpl(DEFAULT_BRAND_SAFETY_CONFIG);
    });
    
    container.registerFactory(ServiceKeys.BRAND_COMPLIANCE_SERVICE, () => {
      return new BrandComplianceServiceImpl();
    });
    
    // Register use cases
    container.registerFactory(ServiceKeys.CHECK_SAFETY_USE_CASE, () => {
      const safetyService = container.resolve<any>(ServiceKeys.SAFETY_EVALUATION_SERVICE);
      const cacheRepo = container.resolve<any>(ServiceKeys.CACHE_REPOSITORY);
      return new CheckSafetyUseCase(safetyService, cacheRepo);
    });
    
    container.registerFactory(ServiceKeys.CHECK_COMPLIANCE_USE_CASE, () => {
      const complianceService = container.resolve<any>(ServiceKeys.BRAND_COMPLIANCE_SERVICE);
      const brandRepo = container.resolve<any>(ServiceKeys.BRAND_SCHEMA_REPOSITORY);
      const cacheRepo = container.resolve<any>(ServiceKeys.CACHE_REPOSITORY);
      return new CheckComplianceUseCase(complianceService, brandRepo, cacheRepo);
    });
    
    container.registerFactory(ServiceKeys.COMBINED_EVALUATION_USE_CASE, () => {
      const safetyUseCase = container.resolve<any>(ServiceKeys.CHECK_SAFETY_USE_CASE);
      const complianceUseCase = container.resolve<any>(ServiceKeys.CHECK_COMPLIANCE_USE_CASE);
      return new CombinedEvaluationUseCase(safetyUseCase, complianceUseCase);
    });
    
    container.registerFactory(ServiceKeys.UPDATE_CONFIG_USE_CASE, () => {
      const safetyService = container.resolve<any>(ServiceKeys.SAFETY_EVALUATION_SERVICE);
      return new UpdateConfigUseCase(safetyService);
    });
    
    container.registerFactory(ServiceKeys.BATCH_EVALUATION_USE_CASE, () => {
      const safetyUseCase = container.resolve<any>(ServiceKeys.CHECK_SAFETY_USE_CASE);
      const complianceUseCase = container.resolve<any>(ServiceKeys.CHECK_COMPLIANCE_USE_CASE);
      const combinedUseCase = container.resolve<any>(ServiceKeys.COMBINED_EVALUATION_USE_CASE);
      return new BatchEvaluationUseCase(safetyUseCase, complianceUseCase, combinedUseCase);
    });
    
    // Register formatters
    container.registerSingleton(
      ServiceKeys.SAFETY_RESPONSE_FORMATTER,
      new SafetyResponseFormatter()
    );
    
    container.registerSingleton(
      ServiceKeys.COMPLIANCE_RESPONSE_FORMATTER,
      new ComplianceResponseFormatter()
    );
    
    container.registerFactory(ServiceKeys.COMBINED_RESPONSE_FORMATTER, () => {
      const safetyFormatter = container.resolve<any>(ServiceKeys.SAFETY_RESPONSE_FORMATTER);
      const complianceFormatter = container.resolve<any>(ServiceKeys.COMPLIANCE_RESPONSE_FORMATTER);
      return new CombinedResponseFormatter(safetyFormatter, complianceFormatter);
    });
    
    container.registerSingleton(
      ServiceKeys.BATCH_RESPONSE_FORMATTER,
      new BatchResponseFormatter()
    );
    
    // Register advanced services
    container.registerSingleton(
      ServiceKeys.MULTI_LANGUAGE_ANALYZER,
      new MultiLanguageAnalyzer()
    );
    
    container.registerSingleton(
      ServiceKeys.CONFIDENCE_SCORER,
      new ConfidenceScorer()
    );
    
    container.registerSingleton(
      ServiceKeys.EVALUATION_EXPLAINER,
      new EvaluationExplainer()
    );
    
    container.registerSingleton(
      ServiceKeys.RECOMMENDATION_ENGINE,
      new RecommendationEngine()
    );
    
    // Register validators
    container.registerSingleton(
      ServiceKeys.MCP_REQUEST_VALIDATOR,
      new McpRequestValidator()
    );
    
    // Register MCP server adapter
    container.registerFactory(ServiceKeys.MCP_SERVER_ADAPTER, () => {
      const safetyUseCase = container.resolve<any>(ServiceKeys.CHECK_SAFETY_USE_CASE);
      const complianceUseCase = container.resolve<any>(ServiceKeys.CHECK_COMPLIANCE_USE_CASE);
      const combinedUseCase = container.resolve<any>(ServiceKeys.COMBINED_EVALUATION_USE_CASE);
      const updateConfigUseCase = container.resolve<any>(ServiceKeys.UPDATE_CONFIG_USE_CASE);
      const batchUseCase = container.resolve<any>(ServiceKeys.BATCH_EVALUATION_USE_CASE);
      const safetyFormatter = container.resolve<any>(ServiceKeys.SAFETY_RESPONSE_FORMATTER);
      const complianceFormatter = container.resolve<any>(ServiceKeys.COMPLIANCE_RESPONSE_FORMATTER);
      const combinedFormatter = container.resolve<any>(ServiceKeys.COMBINED_RESPONSE_FORMATTER);
      const batchFormatter = container.resolve<any>(ServiceKeys.BATCH_RESPONSE_FORMATTER);
      const requestValidator = container.resolve<any>(ServiceKeys.MCP_REQUEST_VALIDATOR);
      
      return new McpServerAdapter(
        safetyUseCase,
        complianceUseCase,
        combinedUseCase,
        updateConfigUseCase,
        batchUseCase,
        safetyFormatter,
        complianceFormatter,
        combinedFormatter,
        batchFormatter,
        requestValidator
      );
    });
    
    return container;
  }
}