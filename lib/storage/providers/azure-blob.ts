import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob'

const ACCOUNT  = process.env.AZURE_STORAGE_ACCOUNT!
const KEY      = process.env.AZURE_STORAGE_KEY!
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'labiadio-docs'

function getClient() {
  const cred = new StorageSharedKeyCredential(ACCOUNT, KEY)
  return new BlobServiceClient(`https://${ACCOUNT}.blob.core.windows.net`, cred)
}

export async function uploadBlob(
  path: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const client = getClient()
  const container = client.getContainerClient(CONTAINER)
  await container.createIfNotExists({ access: 'private' })
  const blob = container.getBlockBlobClient(path)
  await blob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  })
}

export async function getBlobSignedUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const cred = new StorageSharedKeyCredential(ACCOUNT, KEY)
  const expiresOn = new Date(Date.now() + expiresInSeconds * 1000)

  const sas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER,
      blobName: path,
      permissions: BlobSASPermissions.parse('r'),
      expiresOn,
    },
    cred
  ).toString()

  return `https://${ACCOUNT}.blob.core.windows.net/${CONTAINER}/${path}?${sas}`
}

export async function deleteBlob(path: string): Promise<void> {
  const client = getClient()
  const blob = client.getContainerClient(CONTAINER).getBlockBlobClient(path)
  await blob.deleteIfExists()
}
