const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function testUpload() {
    try {
        const s3Client = new S3Client({
            region: 'auto',
            endpoint: \`https://d2d332b0d82f830b06042209d620249a.r2.cloudflarestorage.com\`,
            credentials: {
                accessKeyId: '0d7bedeebc6045657b1d25bf34273ef5',
                secretAccessKey: 'f5904c1c93000026df17ad5559d3de380b5ebaf082b64acf5d44153986949a89',
            },
        });

        const command = new PutObjectCommand({
            Bucket: '4js-academy-uploads',
            Key: 'test_file.txt',
            Body: Buffer.from('Hello R2!'),
            ContentType: 'text/plain',
        });

        console.log('Sending to R2...');
        const response = await s3Client.send(command);
        console.log('Success!', response);
    } catch (err) {
        console.error('Error during upload:', err);
    }
}

testUpload();
