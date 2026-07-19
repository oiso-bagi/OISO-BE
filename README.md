<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## 🐳 로컬 개발 환경 세팅 가이드 (Docker & Prisma)

백엔드 개발 및 로컬 DB 테스트를 위한 가이드입니다.

### 🛠️ 사전 준비

1. 컴퓨터에 **Docker Desktop**이 설치되어 있고 실행 중인지 확인하세요.
2. 프로젝트 루트에 `docker-compose.yml` 파일이 존재하는지 확인하세요.

---

### 🏃 5단계 명령어

새로 레포를 clone 하거나 업데이트(pull) 받으신 후, 터미널에 아래 순서대로 입력하세요.

#### 1. 패키지 설치

```bash
npm install
```

#### 2. 환경 변수 세팅

프로젝트 최상위 폴더(루트)에 .env 파일을 생성하고 공유받은 .env 텍스트를 붙여넣습니다.

#### 3. 로컬 도커 DB 컨테이너 실행

```Bash
docker compose up -d
```

(만약 5432 포트 충돌 에러가 나면 로컬에 켜진 기존 Postgres 프로세스나 다른 도커 컨테이너를 종료해야 합니다.)

#### 4. Prisma DB 스키마 마이그레이션 (테이블 생성)

```Bash
npx prisma migrate deploy
```

#### 5. Prisma Studio (GUI 관리자 화면) 실행

```Bash
npx prisma studio
```

브라우저가 열리며 http://localhost:51212에서 생성된 테이블과 데이터를 시각적으로 확인할 수 있습니다.

#### 🛑 주의 및 그라운드 룰 (Ground Rules)

스키마 변경 제한: 우리 모두가 동일한 도커 컴포즈 구조를 공유하고 있습니다. 개발 중 schema.prisma 파일(테이블 구조)을 수정해야 할 일이 생기면, 임의로 migrate하여 푸시하지 마시고 꼭 단톡방에 먼저 공유해 주세요!
