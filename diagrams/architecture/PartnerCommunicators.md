# Partner Communicators Architecture

This document describes the architecture of the Partner Communicators system, which handles communication with different gaming partners.

## Class Diagram

```mermaid
classDiagram
    class IPartnerResult {
        <<interface>>
        +string Seq
        +int ErrorCode
        +string ErrorMessage
        +string ErrorDescription
        +bool IsSuccessful()
        +bool IsFailed()
    }

    class PartnerResult {
        <<abstract>>
        +string Seq
        +int ErrorCode
        +string ErrorMessage
        +string ErrorDescription
        +bool IsSuccessful()
        +bool IsFailed()
    }

    class PartnerResponse~T~ {
        +DateTimeOffset TimeStamp
        +T Result
        -PartnerRequest Request
        -string AccessKey
    }

    class PartnerCommunicator {
        <<abstract>>
        +IPartnerCustomerServices CustomerService
    }

    class OWCommunicator {
        +OWCustomerService CustomerService
    }

    class SGCommunicator {
        +SGCustomerService CustomerService
        +ISGFailureHandler FailureHandler
        +string SecretKey
    }

    class OWResult {
        +string Seq
        +int ErrorCode
        +string ErrorMessage
        +string ErrorDescription
        +bool IsSuccessful()
        +bool IsFailed()
    }

    class SGResult {
        +string Seq
        +int ErrorCode
        +string ErrorMessage
        +string ErrorDescription
        +bool IsSuccessful()
        +bool IsFailed()
    }

    class OWService {
        +Post~T~(string, IPartnerCall, string)
    }

    class SGService {
        +Post~T~(string, IPartnerCall, string)
        -string HeaderAccessKey
        -HttpClient httpClient
        -ISGFailureHandler failureHandler
        -string secretKey
        -IJsonService jsonService
    }

    IPartnerResult <|.. OWResult
    IPartnerResult <|.. SGResult
    PartnerResponse~T~ --> IPartnerResult
    PartnerCommunicator <|-- OWCommunicator
    PartnerCommunicator <|-- SGCommunicator
    OWCommunicator --> OWService
    SGCommunicator --> SGService
```

## Component Diagram

```mermaid
graph TD
    A[Client] --> B[PartnerCommunicator]
    B --> C[OWCommunicator]
    B --> D[SGCommunicator]
    
    C --> E[OWService]
    C --> F[OWCustomerService]
    
    D --> G[SGService]
    D --> H[SGCustomerService]
    D --> I[ISGFailureHandler]
    
    E --> J[HTTP Client]
    G --> J
    
    F --> K[Logging Service]
    H --> K
    H --> L[NATS Service]
    H --> M[Admin API Service]
    
    subgraph "Common Base"
        B
    end
    
    subgraph "OW Implementation"
        C
        E
        F
    end
    
    subgraph "SG Implementation"
        D
        G
        H
        I
    end
```

## Key Differences

### OWCommunicator
- Uses string-based `playerId`
- Direct implementation of `IPartnerResult`
- Standard HTTP communication
- Basic error handling

### SGCommunicator
- Uses integer-based `playerId`
- Custom authentication with `SG-access-key`
- Specialized error handling
- Additional features:
  - High-stake notifications
  - Retry policies
  - NATS integration
  - Admin API integration 