
-- Support verifier config details used by rules engine
ALTER TABLE "ver_admin"."verifier" 
    ADD COLUMN "configName" VARCHAR(255), 
    ADD COLUMN "configId" VARCHAR(64);
