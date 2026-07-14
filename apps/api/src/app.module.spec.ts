import { MODULE_METADATA } from '@nestjs/common/constants';
import { AdminModule } from './modules/admin/admin.module';
import { AppModule } from './app.module';

describe('AppModule', () => {
  it('registers the admin location-request routes', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);

    expect(imports).toContain(AdminModule);
  });
});
