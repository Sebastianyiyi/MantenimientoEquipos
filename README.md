# Sistema de Mantenimiento de Equipos Tecnológicos

**Universidad Técnica de Ambato — Facultad FISEI**

Plataforma web para la gestión integral del ciclo de vida de equipos electrónicos en laboratorios académicos. Permite registrar equipos, abrir casos de mantenimiento, asignar técnicos, llevar hoja de vida por equipo y generar reportes institucionales.

---

## Tecnologías

**Frontend**
- React 19 + Vite 8
- React Router DOM 7
- Recharts (gráficos)
- Axios
- jsPDF + jsPDF-AutoTable (exportación PDF)
- SheetJS / xlsx (exportación Excel)
- Azure MSAL Browser/React (autenticación Microsoft 365)

**Backend (microservicios)**
- .NET 10 — ASP.NET Core Web API
- Entity Framework Core 10
- SQL Server (Express)
- Arquitectura limpia por capas: API → Application → Domain → Infrastructure

---

## Arquitectura

El proyecto sigue una arquitectura de **microservicios**. Cada servicio tiene su propia base de datos y se comunica con los demás a través de HTTP.

```
src/
├── frontend/                   # Aplicación React (Vite)
└── services/
    ├── AuthService/            # Autenticación y JWT   → :5000
    ├── EquipmentService/       # Gestión de equipos    → :5002
    ├── LocationService/        # Laboratorios y ubicaciones → :5003
    └── MaintenanceService/     # Casos, tickets, reportes  → :5004
```

### Comunicación entre servicios

| Servicio | Puerto | Base de datos |
|---|---|---|
| AuthService | 5000 | `FISEI_AuthDB` |
| EquipmentService | 5002 | `FISEI_EquipmentDB` |
| LocationService | 5003 | `FISEI_LocationDB` |
| MaintenanceService | 5004 | `FISEI_MaintenanceDB` |
| Frontend (dev) | 5173 | — |

---

## Requisitos previos

- [Node.js](https://nodejs.org/) 18+
- [.NET SDK 10](https://dotnet.microsoft.com/download)
- SQL Server Express (o SQL Server local)
- Cuenta de Azure AD / Microsoft 365 configurada

---

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd MantenimientoEquipos-develop
```

### 2. Configurar las bases de datos

Cada servicio tiene su propio `appsettings.json`. Edite la cadena de conexión según su entorno local:

```json
// Ejemplo: src/services/EquipmentService/EquipmentService.API/appsettings.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=FISEI_EquipmentDB;Trusted_Connection=True;TrustServerCertificate=True;"
  }
}
```

Repita esto para `AuthService`, `LocationService` y `MaintenanceService`.

### 3. Ejecutar las migraciones

Desde la raíz del repositorio, aplique las migraciones de cada servicio:

```bash
# AuthService
cd src/services/AuthService/AuthService.API
dotnet ef database update

# EquipmentService
cd ../../EquipmentService/EquipmentService.API
dotnet ef database update

# LocationService
cd ../../LocationService/LocationService.API
dotnet ef database update

# MaintenanceService
cd ../../MaintenanceService/MaintenanceService.API
dotnet ef database update
```

### 4. Levantar los microservicios

Abra una terminal por servicio y ejecute:

```bash
# Terminal 1 — AuthService
cd src/services/AuthService/AuthService.API
dotnet run

# Terminal 2 — EquipmentService
cd src/services/EquipmentService/EquipmentService.API
dotnet run

# Terminal 3 — LocationService
cd src/services/LocationService/LocationService.API
dotnet run

# Terminal 4 — MaintenanceService
cd src/services/MaintenanceService/MaintenanceService.API
dotnet run
```

### 5. Levantar el frontend

```bash
cd src/frontend
npm install
npm run dev
```

La aplicación estará disponible en [http://localhost:5173](http://localhost:5173).

---

## Configuración de autenticación (Azure AD)

El frontend usa **MSAL** para autenticar usuarios con Microsoft 365. El archivo de configuración es:

```
src/frontend/src/authConfig.js
```

```js
export const msalConfig = {
  auth: {
    clientId: "<CLIENT_ID_DE_AZURE>",
    authority: "https://login.microsoftonline.com/<TENANT_ID>",
    redirectUri: "http://localhost:5173",
  }
}
```

Actualice `clientId` y el `TENANT_ID` con los valores de su registro de aplicación en Azure Active Directory.

El **AuthService** también requiere configurar JWT en su `appsettings.json`:

```json
"JwtSettings": {
  "SecretKey": "<clave-secreta-minimo-32-caracteres>",
  "Issuer": "fisei-inventory",
  "Audience": "fisei-inventory-client",
  "ExpirationMinutes": 480
}
```

---

## Módulos principales

| Módulo | Descripción | Roles |
|---|---|---|
| Dashboard | KPIs, gráficas de estado y tendencias | Todos |
| Gestión de Equipos | CRUD de equipos, ficha técnica, filtros | Todos |
| Casos de Mantenimiento | Tickets correctivos, preventivos y adaptativos | Todos |
| Hoja de Vida | Historial cronológico de mantenimientos por equipo | Todos |
| Reemplazo de Equipos | Proceso guiado de sustitución de equipos | Todos |
| Importar Equipos | Carga masiva desde CSV | Todos |
| Catálogos del Sistema | Tipos, laboratorios, actividades, diagnósticos | Administrador |
| Gestión de Usuarios | Roles y estado de cuentas institucionales | Administrador |
| Reportes | Estadísticas e inventario en PDF / Excel | Administrador |

---

## Scripts disponibles

### Frontend

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción
npm run preview   # Vista previa del build
npm run lint      # Linting con ESLint
```

### Backend (por servicio)

```bash
dotnet run                    # Ejecutar en desarrollo
dotnet build                  # Compilar
dotnet ef migrations add <Nombre>   # Nueva migración
dotnet ef database update     # Aplicar migraciones
```

---

## Estructura del proyecto

```
MantenimientoEquipos-develop/
├── src/
│   ├── frontend/
│   │   ├── public/
│   │   └── src/
│   │       ├── assets/
│   │       ├── components/       # Sidebar, Topbar, CustomSelect, etc.
│   │       ├── contexts/         # AuthContext
│   │       ├── pages/
│   │       │   ├── auth/         # Login, SinAcceso
│   │       │   ├── dashboard/
│   │       │   ├── equipos/      # Listado, Nuevo, Editar, Ficha
│   │       │   ├── casos/        # Listado, Nuevo, Editar, Detalle
│   │       │   ├── hojadevida/
│   │       │   ├── reemplazo/
│   │       │   ├── importar/
│   │       │   ├── catalogos/
│   │       │   ├── usuarios/
│   │       │   └── reportes/
│   │       ├── routes/           # ProtectedRoute
│   │       ├── services/         # Clientes Axios por microservicio
│   │       └── App.jsx
│   └── services/
│       ├── AuthService/
│       │   ├── AuthService.API/
│       │   ├── AuthService.Application/
│       │   ├── AuthService.Domain/
│       │   └── AuthService.Infrastructure/
│       ├── EquipmentService/
│       ├── LocationService/
│       └── MaintenanceService/
└── README.md
```

---

## Roles del sistema

| Rol | Descripción |
|---|---|
| **Administrador** | Acceso completo a todos los módulos. |
| **Laboratorista** | Acceso operativo: equipos, casos, hoja de vida y reemplazos. |

Los roles se asignan desde el módulo de **Gestión de Usuarios** por un Administrador. Las cuentas se crean automáticamente al primer inicio de sesión con Microsoft 365.

---

## Licencia

Este proyecto está bajo la licencia MIT. Consulte el archivo `LICENSE` para más información.
