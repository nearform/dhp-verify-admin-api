/**
 * Digital Health Pass 
 *
 * (c) Copyright Merative US L.P. and others 2020-2022 
 *
 * SPDX-Licence-Identifier: Apache 2.0
 */

const { DataTypes } = require('sequelize');
const dbmodels = require('./dbmodels');

// eslint-disable-next-line max-lines-per-function
const init = (sequelize) => {
    const Customer = sequelize.define('Customer', {
        // Model attributes 
        customerId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(64),
            allowNull: false,
        },
        label: {
            type: DataTypes.STRING(128),
        },
        billingId: {
            type: DataTypes.STRING(128),
        },
        url: {
            type: DataTypes.STRING(128),
            // allowNull defaults to true
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active'
        },
        businessType: {
            type: DataTypes.STRING(64),
        }
    }, {
        schema: dbmodels.admindbSchemaName,
        tableName: 'customer'

    });

    const Organization = sequelize.define('Organization', {
        // Model attributes are defined here
        orgId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(64),
            allowNull: false,
        },
        label: {
            type: DataTypes.STRING(128),
        },
        customerId: {
            type: DataTypes.UUID
        },
        url: {
            type: DataTypes.STRING(128),
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active'
        },
        minEmployees: {
            type: DataTypes.STRING(64),
        },
        maxEmployees: {
            type: DataTypes.STRING(64),
        }
    }, {
        schema: dbmodels.admindbSchemaName,
        tableName: 'organization'

    });


    const Address = sequelize.define('Address', {
        addressId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        street: {
            type: DataTypes.STRING(128),
        },
        locality: {
            type: DataTypes.STRING(64)
        },
        region: {
            type: DataTypes.STRING(64),
        },
        postalCode: {
            type: DataTypes.STRING(32),
        },
        country: {
            type: DataTypes.STRING(64),
        },

    }, {
        schema: dbmodels.admindbSchemaName,
        tableName: 'address'
    });

    const Verifier = sequelize.define('Verifier', {
        verifierId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING(64)
        },
        label: {
            type: DataTypes.STRING(128)
        },
        customerId: {
            type: DataTypes.UUID
        },
        orgId: {
            type: DataTypes.UUID
        },
        verifierType: {
            type: DataTypes.STRING(64)
        },
        did: {
            type: DataTypes.STRING(255),
            // allowNull defaults to true
        },
        expirationDate: {
            type: DataTypes.DATE,
        },
        status: {
            type: DataTypes.ENUM('active', 'revoked', 'pending'),
            defaultValue: 'active'
        },
        credential: {
            type: DataTypes.TEXT,
        },
        configId: {
            type: DataTypes.STRING(64)
        },
        configName: {
            type: DataTypes.STRING(255)
        }
    }, {
        schema: dbmodels.admindbSchemaName,
        tableName: 'verifier'

    });



    const User = sequelize.define('User', {
        // Model attributes are defined here
        userId: {
            type: DataTypes.STRING(64),
            primaryKey: true
        },
        role: {
            type: DataTypes.STRING(64),
        },
        customerId: {
            type: DataTypes.STRING(64),
        },
        orgId: {
            type: DataTypes.STRING(64),
        },

    }, {
        schema: dbmodels.admindbSchemaName,
        tableName: 'user'
    });

    const Profiles = sequelize.define('Profiles', {
        // Model attributes are defined here
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },
        profileId: {
            type: DataTypes.STRING(64)
        },
        configId: {
            type: DataTypes.STRING(64),
            defaultValue: null
        },
        version: {
            type: DataTypes.STRING(16)
        },
        updatedBy: {
            type: DataTypes.STRING(64)
        }

    }, {
        schema: dbmodels.admindbSchemaName,
        tableName: 'profiles',
        timestamps: true
    });

    // Associations
    Customer.hasMany(Organization, {
        foreignKey: 'customerId',
        allowNull: false,
    });

    Organization.belongsTo(Address, {
        foreignKey: 'addressId',
        allowNull: true,
        // onDelete: 'CASCADE'
    });

    Customer.hasMany(Verifier, {
        foreignKey: 'customerId',
        allowNull: false,
    });
    Organization.hasMany(Verifier, {
        foreignKey: 'orgId',
        allowNull: false,
    });

    const models = { Customer, Organization, Address, User, Verifier, Profiles };
    return models;
}


module.exports = {
    init,
}