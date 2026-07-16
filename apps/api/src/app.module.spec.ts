import { MODULE_METADATA } from '@nestjs/common/constants';
import { AdminModule } from './modules/admin/admin.module';
import { LocationModule } from './modules/locations/location.module';
import { VendorLocationsModule } from './modules/vendor-locations/vendor-locations.module';
import { AppModule } from './app.module';

describe('AppModule', () => {
  it('registers the admin location-request routes', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);

    expect(imports).toContain(AdminModule);
  });

  it('registers vendor location routes before generic location routes', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);

    expect(imports.indexOf(VendorLocationsModule)).toBeLessThan(
      imports.indexOf(LocationModule),
    );
  });
});
