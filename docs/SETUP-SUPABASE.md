# Setup do Supabase (Auth + Banco) — grátis

O UniteOn usa **Supabase** para login (e-mail/senha) e como Postgres do app. Tudo no
plano **gratuito**. Enquanto não configurado, o app roda em **modo dev** (login mockado
por `/office?name=Fulano`).

## 1. Criar o projeto (grátis)

1. https://supabase.com → New project (região mais próxima, ex.: São Paulo).
2. Guarde a senha do banco que você definir.

## 2. Pegar as chaves

**Project Settings → API:**
- **Project URL** → `SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_URL`
- **Project API keys → anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **JWT Settings → JWT Secret** → `SUPABASE_JWT_SECRET`

**Project Settings → Database → Connection string** (para o Épico 0b / migrations):
- **Transaction pooler** (porta 6543) → `DATABASE_URL`
- **Session pooler** (porta 5432) → `DIRECT_URL`

## 3. Preencher os `.env`

**`C:\Dev\UniteOn\.env`** (servidor — NÃO versionar):
```
SUPABASE_URL="https://xxxx.supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_JWT_SECRET="..."          # ativa o login real (realtime passa a exigir token)
DATABASE_URL="postgresql://...:6543/postgres"   # (0b)
DIRECT_URL="postgresql://...:5432/postgres"     # (0b)
```

**`C:\Dev\UniteOn\apps\web\.env.local`** (cliente — copie de `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
NEXT_PUBLIC_REALTIME_URL="http://localhost:3002"
```

## 4. Criar os usuários (você é o admin)

Como o login é **e-mail/senha** e as contas são criadas pelo administrador:

**Authentication → Users → Add user:**
- E-mail + senha, marque **Auto Confirm User**.
- (Opcional) Em **User Metadata** adicione `{ "name": "Caio" }` para exibir o nome no
  avatar (senão usa o começo do e-mail).

Crie uma conta para você e uma para o Vinicius.

## 5. Rodar e entrar

```bash
pnpm dev
```
Abra `http://localhost:3000` → **Entrar no escritório** → cai no `/login` → entre com
e-mail/senha. Sem Supabase configurado, o `/office?name=Fulano` continua funcionando
para dev.

> Observação: no plano free o projeto Supabase **pausa após ~1 semana** de inatividade —
> basta reativar no dashboard.
