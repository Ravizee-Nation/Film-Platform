import { prepareTemplateDatabase, testAdminUrl } from '@film/db/testing';

export default async function setup() {
  await prepareTemplateDatabase(testAdminUrl());
}
