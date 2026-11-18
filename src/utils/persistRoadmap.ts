import type {RoadmapMilestone} from '../types/data';
import {recordValue} from './studioData';

/** Old deployments can still save text while the additive photo migration awaits approval. */
export async function persistRoadmap(write:(payload:Partial<RoadmapMilestone>)=>Promise<unknown>,payload:Partial<RoadmapMilestone>) {
  try {await write(payload);} catch(error) {
    const row=recordValue(error),message=typeof row.message==='string'?row.message:'';
    const missingPhotos='images' in payload&&['PGRST204','42703'].includes(String(row.code))&&/\bimages\b/i.test(message)&&/column|schema cache/i.test(message);
    if(!missingPhotos)throw error;
    if(payload.images?.length)throw new Error('Timeline photo storage setup is pending. Your photo draft is kept; save again after the database update.');
    const legacy={...payload};delete legacy.images;
    await write(legacy);
  }
}
