const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function testEndpoint(name, endpoint) {
    console.log(`\n--- Testing ${name} Endpoint ---`);
    console.log('Endpoint:', endpoint);

    const s3Client = new S3Client({
        region: 'auto',
        endpoint: endpoint,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        }
    });

    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            MaxKeys: 1
        });
        await s3Client.send(command);
        console.log(`✅ Success! Connected via ${name} endpoint.`);
        return true;
    } catch (err) {
        console.error(`❌ Failed: ${err.message}`);
        return false;
    }
}

async function start() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const defaultEndpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const euEndpoint = `https://${accountId}.eu.r2.cloudflarestorage.com`;

    const ok1 = await testEndpoint('Default', defaultEndpoint);
    if (!ok1) {
        await testEndpoint('EU Jurisdiction', euEndpoint);
    }
}

start();
