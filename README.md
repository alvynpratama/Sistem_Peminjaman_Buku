# 📚 Library Cloud - Microservices Library System

[![Docker](https://img.shields.io/badge/Docker-Enabled-blue?logo=docker)](https://www.docker.com/)
[![Azure](https://img.shields.io/badge/Azure-Cloud_Ready-0078D4?logo=microsoft-azure)](https://azure.microsoft.com/)
[![Theme](https://img.shields.io/badge/Design-Gold_Luxury-D4AF37)](https://tailwindcss.com/)

**Library Cloud** adalah platform manajemen perpustakaan modern berbasis **Microservices**. Proyek ini dirancang untuk memenuhi kriteria tugas besar mata kuliah **Data Warehouse** dengan fokus pada skalabilitas, keamanan JWT, dan antarmuka pengguna yang elegan.

---

## 🏗️ Arsitektur Sistem (Mermaid Diagram)

Sistem ini menggunakan pola **Database per Service** untuk memastikan independensi setiap layanan.

```mermaid
graph TD
    %% Actors Layer
    Admin((👤 Admin Browser))
    Member((👤 Member Browser))
    
    subgraph Azure_Cloud [Microsoft Azure Environment]
        subgraph Front_Layer [User Interface & Gateway]
            App_FE[Azure App Service: Gateway Frontend]
        end

        subgraph Container_Registry [Security & Registry]
            ACR[Azure Container Registry]
            AKV[Azure Key Vault]
        end

        subgraph Service_Layer [Microservices Layer]
            App_Auth[Azure App Service: Auth Service]
            App_Main[Azure App Service: Main Service]
        end

        subgraph Storage_Layer [Data Management]
            DB_MySQL[(Azure Database for MySQL - Flexible Server)]
        end
    end

    %% Connections for Member
    Member -- "Akses Katalog & Peminjaman" --> App_FE
    
    %% Connections for Admin
    Admin -- "Manajemen Buku & Monitoring" --> App_FE
    
    %% Internal API Routing with RBAC labels
    App_FE -- "Verify Identity (JWT)" --> App_Auth
    App_FE -- "Execute Logic (RBAC Check)" --> App_Main
    
    %% Database Operations
    App_Auth -- "Manage User Roles" --> DB_MySQL
    App_Main -- "CRUD Books & Logs" --> DB_MySQL
    
    %% Secrets management
    AKV -. "Secrets: DB_PWD, JWT_KEY" .-> App_Auth
    AKV -. "Secrets: DB_PWD" .-> App_Main
    
    %% Image Deployment
    ACR -. "Pull Container Image" .-> App_FE
    ACR -. "Pull Container Image" .-> App_Auth
    ACR -. "Pull Container Image" .-> App_Main

    %% Styling (Gold Luxury Theme)
    style Admin fill:#d4af37,stroke:#b8860b,stroke-width:2px,color:#000
    style Member fill:#f3f4f6,stroke:#9ca3af,stroke-width:2px,color:#000
    style App_FE fill:#f1d382,stroke:#d4af37,stroke-width:3px,color:#000
    style App_Auth fill:#fff,stroke:#d4af37,stroke-width:2px,color:#d4af37
    style App_Main fill:#fff,stroke:#d4af37,stroke-width:2px,color:#d4af37
    style DB_MySQL fill:#0078d4,stroke:#005a9e,stroke-width:2px,color:#fff
    style AKV fill:#00a3d9,stroke:#0078a6,color:#fff
    style ACR fill:#00a3d9,stroke:#0078a6,color:#fff
