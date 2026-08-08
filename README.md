## Migration

### Generate Migration File

npm run typeorm -- migration:generate src/migrations/InitialSchema -d ./src/data-source-migration.ts

### Run Migration File

npm run typeorm -- migration:run -d ./src/data-source-migration.ts

### Generate token secret

openssl rand -base64 48
