## Notes for the runbook
### Pre-deployment 
- Create Verifier login schema via DemoCollection postman on existing prod
- Create postgres for database instance, instance config/size TBD
  - Enable private endpoint in database
  - Download connection config json for Service Credentials  
  - connect via psql
    - For dhp-verify-admin-api create DB : hpassadmindb
    - For metering service create DB : hpassmeteringdb
  ```
  export PGPASSWORD=
  export USERNAME=
  export PGPORT=
  export PGHOST=<abc>.databases.appdomain.cloud (use public endpoint for connecting from laptop)
  psql "host=$PGHOST port=$PGPORT dbname=ibmclouddb user=$USERNAME sslmode=require"

  #run 
  CREATE DATABASE hpassadmindb;
  CREATE DATABASE hpassmeteringdb;
```

### Hpass core
- ensure hpass-api env config ISSUER_ID is set correctly. Check in helm overrides of 04-hpass-api (it was not set in prod correctly in last release): 
```
issuer:
  id: hpass.issuer1
```

### Deploy
- Copy private endpoint from cloud UI: Overview > CLI > private endpoint
- Set Helm params
  - Database connection params
    - db: <Use the private endpoint listed for the instance, typically  abc.private.databases.appdomain.cloud>
    - host:
    - username: 
    - password:
    - cacert: Use PG CA cert from connection config, set the value (already encoded in base64) 
- deploy: hpass core, verifier admin & UI

### AppID
  - Provided Postman collection and environment
    - Call OnboardApp api to add scope/roles
  - Open cloud AppID UI: Add AppID user `metering@poc.com` with role `meter-reporter`      
  - To support existing hpassadmin: Add 4 Appid Roles verifier-sysadmin , verifier-orgadmin, verifier-custadmin, meter-reporter
    - login as hpassadmin in the Postman, via adminapi > From the response, get userId value to use as {adminuserId} in sql below
    - Use Postgres psql, connect to new db
    - add row in hpassadmindb.user table, e.g.
    ```
    \c hpassadmindb

    insert into ver_admin.user("userId", "role", "customerId", "orgId", "createdAt", "updatedAt") values ('{adminuserId}', 'sysadmin', '*','*', '2021-04-22 15:00:00+00', '2021-04-22 15:00:00+00');
    ```
  
  - Provided Postman collection and environment
    - call OnboardUser Sysadmin User:  `onboardingsysadmin@poc.com`
  
  - Note: User and role mapping for reference. No action needed
    - sysadmin Users,  Appid Roles = verifier.sysadmin , verifier.orgadmin, verifier.custadmin
    - custadmin Users, Appid Roles = verifier.orgadmin, verifier.custadmin 
    - orgadmin role = verifier.custadmin 
  

### Smoke test
- Provided postman to test GET api on metering api
- Login to dhp-verify-admin-ui via sysadmin, create Customer `IBMInternal`
- Generate credential, test login with mobile app & upload metrics