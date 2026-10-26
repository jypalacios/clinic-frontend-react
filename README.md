# Clinica Backend

Aplicación de backend para la gestión clínica, desarrollada con FastAPI, SQLAlchemy y PostgreSQL.

## Arquitectura general

┌──────────────┐     HTTP/JSON     ┌────────────────┐     SQLAlchemy     ┌──────────────┐
│  Frontend    │ ───────────────► │   Backend      │ ───────────────► │  PostgreSQL  │
│  React / UI  │                  │  FastAPI       │                  │  Base de     │
│              │                  │  + SQLAlchemy  │                  │  datos       │
└──────────────┘                  └────────────────┘                  └──────────────┘

## Objetivo del proyecto

Este backend permite:
- gestionar usuarios y roles
- registrar pacientes
- gestionar médicos y especialidades
- agendar citas
- autenticar usuarios mediante JWT
- mantener el esquema versionado con Alembic

## Stack tecnológico

- Python 3.11+
- FastAPI
- SQLAlchemy 2.x
- PostgreSQL
- Alembic
- Pydantic
- Passlib + Argon2
- python-jose
- Docker / Docker Compose

## Frontend

La aplicación web de este proyecto está en la raíz `clinica_frontend/` y utiliza React, TypeScript y Vite. Para iniciar el entorno local desde esa raíz:

```bash
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:8091`, tanto en desarrollo como al ejecutarse con Docker Compose. La API se configura con `VITE_API_URL` (por defecto `/api/v1`). En desarrollo, las llamadas `/api` se envían al backend indicado por `VITE_API_PROXY_TARGET` (por defecto `http://localhost:8090`); consulta `.env.example`.
El frontend solo consume esas dos variables `VITE_`. Las variables de PostgreSQL, JWT y configuración de FastAPI presentes en `.env` pertenecen al backend y no son leídas por esta aplicación.

Para compilar y validar los tipos, ejecuta `npm run build`. El `Dockerfile` de la raíz compila la aplicación y la sirve con Nginx, que reenvía `/api/` al contenedor `clinica_backend` en el puerto `8090`. Ambos contenedores deben estar conectados a la red Docker `dev1_network`.
El directorio `/app` usado por `WORKDIR` existe dentro de la etapa de build de Docker; no es necesario crearlo en el proyecto.

Para construir y levantar el frontend con Docker Compose, ejecuta desde la raíz:

```bash
docker compose up --build -d
```

La aplicación quedará disponible en `http://localhost:8091`. Para que las llamadas `/api/` funcionen, conecta el contenedor del backend a la misma red Docker `dev1_network`; Nginx lo busca como `clinica_backend:8090`.

## Estructura del proyecto

clinica_backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── patients.py
│   │       ├── doctors.py
│   │       └── appointments.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── deps.py
│   ├── db/
│   │   ├── base.py
│   │   └── session.py
│   ├── models/
│   │   ├── user.py
│   │   ├── role.py
│   │   ├── sexo.py
│   │   ├── specialty.py
│   │   ├── patient.py
│   │   ├── doctor.py
│   │   └── appointment.py
│   ├── schemas/
│   │   ├── auth_schema.py
│   │   ├── user_schema.py
│   │   ├── patient_schema.py
│   │   ├── doctor_schema.py
│   │   └── appointment_schema.py
│   ├── repositories/
│   │   ├── user_repository.py
│   │   ├── patient_repository.py
│   │   ├── doctor_repository.py
│   │   └── appointment_repository.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── patient_service.py
│   │   ├── doctor_service.py
│   │   └── appointment_service.py
│   ├── main.py
│   └── __init__.py
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── alembic.ini
├── 01_tablas.sql
├── 02_procedimientos.sql
├── 03_vistas.sql
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── config.md
└── README.md

## Principales módulos de negocio

### Autenticación
- login con email y contraseña
- generación de token JWT
- validación del usuario autenticado
- control de acceso por rol

### Usuarios
- registro de usuarios desde la sección Usuarios para los roles autorizados
- edición, estado y cambio de contraseña con permiso `users.manage`
- administración de roles y permisos desde Roles y permisos
- validación de email, usuario y cédula

El rol `ASISTENTE` puede consultar y crear usuarios, pero no puede asignar roles administrativos ni editar cuentas, estados o contraseñas. Para ver los permisos nuevos en una sesión ya iniciada, recarga la aplicación o vuelve a iniciar sesión.

### Pacientes
- registro de pacientes
- consulta por identificación
- relación con citas

### Médicos
- registro de médicos
- consulta por especialidad y datos del profesional

### Atención clínica
- Historia clínica conserva la consulta y gestión de historias con `medical_history.*`.
- Consultas muestra la misma información clínica, limitada a pacientes que aparecen en Mis citas programadas; `consultations.view` permite consultar, `consultations.create` registrar atenciones y `consultations.edit` rectificar notas.
- Los accesos a Consultas se muestran según los permisos asignados al rol autenticado.

### Citas
- agendamiento de consultas
- asociación con paciente y médico
- consulta por disponibilidad y historial

## Flujo de trabajo recomendado

1. La base de datos PostgreSQL queda levantada con Docker o con el entorno del proyecto.
2. El backend inicia con FastAPI.
3. Los endpoints consumen la capa de servicios.
4. Los servicios usan repositorios para acceso a datos.
5. Los modelos SQLAlchemy reflejan el esquema de la base.
6. Alembic se usa para versionar futuros cambios de esquema.

## Estado actual

El proyecto ya cuenta con:
- estructura base del backend
- modelos principales
- schemas Pydantic
- repositorios
- servicios
- endpoints v1
- seguridad JWT y control por roles
- configuración Alembic

## Siguientes mejoras propuestas

- completar módulos de historias clínicas
- añadir auditoría de acciones
- implementar paginación y filtros
- consolidar validaciones por rol y permisos más específicos
- preparar pruebas automáticas
