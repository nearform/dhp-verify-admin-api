CREATE SCHEMA IF NOT EXISTS ver_admin;

------ Create DDL : original release ---
DROP TYPE IF EXISTS "ver_admin"."enum_customer_status"; CREATE TYPE "ver_admin"."enum_customer_status" AS ENUM('active', 
'inactive');

DROP TYPE IF EXISTS "ver_admin"."enum_organization_status"; CREATE TYPE "ver_admin"."enum_organization_status" AS 
ENUM('active', 'inactive');

CREATE TABLE IF NOT EXISTS "ver_admin"."customer" ("customerId" UUID , "name" VARCHAR(64) NOT NULL, "label" VARCHAR(128), "billingId" VARCHAR(128), "url" VARCHAR(128), "status" "ver_admin"."enum_customer_status" DEFAULT 'active', "businessType" VARCHAR(64), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("customerId"));

CREATE TABLE IF NOT EXISTS "ver_admin"."address" ("addressId" UUID , "street" VARCHAR(128), "locality" VARCHAR(64), "region" VARCHAR(64), "postalCode" VARCHAR(32), "country" VARCHAR(64), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("addressId"));

CREATE TABLE IF NOT EXISTS "ver_admin"."organization" ("orgId" UUID , "name" VARCHAR(64) NOT NULL, "label" VARCHAR(128), "customerId" UUID REFERENCES "ver_admin"."customer" ("customerId") ON DELETE CASCADE ON UPDATE CASCADE, "url" VARCHAR(128), "status" "ver_admin"."enum_organization_status" DEFAULT 'active', "minEmployees" VARCHAR(64), "maxEmployees" VARCHAR(64), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "addressId" UUID REFERENCES "ver_admin"."address" ("addressId") ON DELETE SET NULL ON UPDATE CASCADE, PRIMARY KEY ("orgId"));

DROP TYPE IF EXISTS "ver_admin"."enum_verifier_status"; CREATE TYPE "ver_admin".
"enum_verifier_status" AS ENUM('active', 'revoked', 'pending');

CREATE TABLE IF NOT EXISTS "ver_admin"."verifier" ("verifierId" UUID , "name" VARCHAR(64), "label" VARCHAR(128), "customerId" UUID REFERENCES "ver_admin"."customer" ("customerId") ON DELETE CASCADE ON UPDATE CASCADE, "orgId" UUID REFERENCES "ver_admin"."organization" ("orgId") ON DELETE CASCADE ON UPDATE CASCADE, "verifierType" VARCHAR(64), "did" VARCHAR(255), "expirationDate" TIMESTAMP WITH TIME ZONE, "status" "ver_admin"."enum_verifier_status" DEFAULT 'active', "credential" TEXT, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("verifierId"));


CREATE TABLE IF NOT EXISTS "ver_admin"."user" ("userId" VARCHAR(64) , "role" VARCHAR(64), "customerId" VARCHAR(64), "orgId" VARCHAR(64), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY ("userId"));
