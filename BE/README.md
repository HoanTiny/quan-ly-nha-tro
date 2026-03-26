# Tro Backend

NestJS-style backend cho bai toan quan ly chi tieu nha tro.

## Modules MVP

- `auth`: register, login, current user
- `houses`, `rooms`: scope theo house
- `expenses`: tao va chia chi phi
- `settlements`: tong hop cong no cuoi thang
- `payments`: QR/manual proof hooks
- `notifications`: in-app notifications + cron reminders
- `dashboard`: summary data cho admin/member

## Run

```bash
npm install
npm run prisma:generate
npm run start:dev
```
