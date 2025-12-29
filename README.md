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
    Admin((👤 Admin Browser))
    Member((👤 Member Browser))
    
    subgraph Azure_Cloud [Microsoft Azure Environment]
        subgraph Front_Layer [User Interface & Gateway]
            App_FE[Azure App Service: Gateway Frontend]
        end

        subgraph Service_Layer [Microservices Layer]
            App_Auth[Azure App Service: Auth Service]
            App_Main[Azure App Service: Main Service]
        end

        subgraph Storage_Layer [Data Management]
            DB_MySQL[(Azure Database for MySQL)]
        end
    end

    Member -- "Akses Katalog" --> App_FE
    Admin -- "Manajemen Inventaris" --> App_FE
    App_FE -- "JWT Auth" --> App_Auth
    App_FE -- "Library Logic" --> App_Main
    App_Auth --> DB_MySQL
    App_Main --> DB_MySQL
