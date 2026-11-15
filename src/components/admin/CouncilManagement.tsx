import React from 'react';
import { TeamMembersManagement } from './TeamMembersManagement';
import { CouncilLightingManagement } from './CouncilLightingManagement';

export const CouncilManagement: React.FC = () => <div className="space-y-8"><CouncilLightingManagement /><TeamMembersManagement isCouncilMode /></div>;
