import React, { ReactNode } from 'react';
import { CoreDataProvider } from './CoreDataContext';
import { EventsProvider } from './EventsContext';
import { PersonnelProvider } from './PersonnelContext';
import { GalleryProvider } from './GalleryContext';
import { ManagementProvider } from './ManagementContext';

export const CombinedDataProvider = ({ children }: { children: ReactNode }) => {
  return (
    <CoreDataProvider>
      <EventsProvider>
        <PersonnelProvider>
          <GalleryProvider>
            <ManagementProvider>
              {children}
            </ManagementProvider>
          </GalleryProvider>
        </PersonnelProvider>
      </EventsProvider>
    </CoreDataProvider>
  );
};
