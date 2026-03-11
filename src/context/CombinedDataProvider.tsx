import React, { ReactNode } from 'react';
import { CoreDataProvider } from './CoreDataContext';
import { EventsProvider } from './EventsContext';
import { PersonnelProvider } from './PersonnelContext';
import { GalleryProvider } from './GalleryContext';
import { ManagementProvider } from './ManagementContext';
import { SportsProvider } from './SportsContext';
import { AnnualSportsProvider } from './AnnualSportsContext';

export const CombinedDataProvider = ({ children }: { children: ReactNode }) => {
  return (
    <CoreDataProvider>
      <EventsProvider>
        <PersonnelProvider>
          <GalleryProvider>
            <ManagementProvider>
              <SportsProvider>
                <AnnualSportsProvider>
                  {children}
                </AnnualSportsProvider>
              </SportsProvider>
            </ManagementProvider>
          </GalleryProvider>
        </PersonnelProvider>
      </EventsProvider>
    </CoreDataProvider>
  );
};
