Brand Compliance AI

Stack:
- NestJS
- TypeScript
- Prisma
- PostgreSQL
- OpenAI API
- WordPress UI planned

Workflow:
Maker uploads asset
→ background AI scoring
→ 3 compliance checks
→ Checker review/override
→ Admin release

AI checks:
- FOREIGN_LOGO
- BRAND_COMPLIANCE
- MAS_ADVERTISING

npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev
npm run start:dev