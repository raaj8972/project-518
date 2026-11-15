# Character model and artist handoff

The live scene uses `public/models/cinematic/warden-v2.glb` through `characterAsset.ts`: 44,062 triangles, 20 bones, six material batches, six embedded 512px PBR maps, `Walk`/`Idle`, 3,651,320 bytes. The original `warden.glb` is preserved. The new mask has real shaped eye openings, a raised nose and jaw vents; the breastplate is convex with an open neckline, the shoulder normals are corrected, and the cape has weighted folds and gold embroidery.

This remains a procedural character study, not a finished film-quality sculpt or exact reference match. Horizontal drag in the actual portal scene orbits the camera around the character. Vertical scroll continues the walk. There is no separate viewer.

Rebuild using `/usr/local/bin/node scripts/generate-cinematic-character.mjs`. Bump the runtime asset version after regenerating a served file. `scripts/blender-cinematic-assets.py` imports the new rig for editable refinement. Blender was not found in the standard local application/CLI paths; this pass uses the existing Three.js asset generator.

## Beginner option

I suggest [Meshy](https://www.meshy.ai/). Its [official animation guide](https://docs.meshy.ai/en/webapp/guides/animate) covers rigging, adding motions and exporting animated GLB files.

1. Prepare a full-body front reference on a plain background in an A-pose. Use the supplied rear reference for the cape/armour style, but include a front design: a back-only image cannot specify the mask.
2. Use **Image to 3D**. Keep the cape clear of the arms/legs so limbs are not fused together.
3. Rotate the result and inspect the mask, hands, shoulders and cape before rigging.
4. Use **Rig**, add a restrained **Walk** and **Idle**, and preview both. A-pose/T-pose is recommended in Meshy's documentation.
5. Download a rigged **GLB** with all added animations and retain the project/source. The website integration must verify clip names, scale, facing direction and root motion before replacing the current asset.

Copyable design prompt for a reference/generation:

```text
Original cinematic emerald gate warden with realistic adult human proportions,
deep forest-green tailored hood and heavy woven cape, stern forged silver
full-face mask with narrow recessed eyes, an angular nose and subtle ventilation,
worn dark steel plate armour with restrained antique-gold edges, rounded layered
pauldrons, leather under-armour and gloves. Match the supplied rear reference's
cloth weight and aged metal finish. Original winged-staff embroidery on the back.
Full body, neutral A-pose, front view, plain neutral background, studio lighting.
Separate deformable cape, not fused to arms or legs. Game-ready topology and PBR
textures. No environment, portal, weapons, text, toy proportions, plastic metal,
luminous cartoon eyes or a stiff cone cape.
```

[Tripo](https://www.tripo3d.ai/product-doc/module-post-processing/rigging-animation) is an alternative; its current guide recommends FBX to preserve skeletal/animation data reliably. Convert and verify before serving a GLB. [Mixamo](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html) is useful for humanoid rigs/motions after the model exists; its supported uploads are FBX, OBJ or ZIP rather than GLB.

## Closest route to the film reference

Hire a **3D character artist experienced in Blender/Substance Painter** and provide the references, this brief and the existing rigged base. Ask for:

- Finished mask/hood/armour sculpt, believable anatomy, joint retopology and baked detail normals.
- A separate cape with sculpted rest folds, cloth bones and hand-painted weights. Bake cloth motion rather than requiring phone-side cloth simulation.
- In-place `Walk` and `Idle`, planted feet, smooth blending and no cape/limb clipping.
- A mobile LOD around 25–45k triangles, few materials, 1k textures initially and a compressed GLB target around 5 MB. These are project budgets, not guarantees for AI-generated drafts.
- Source `.blend`, textures, final `.glb`, front/back turntable and clear usage rights.

AI generation can provide a starting mesh; auto-rigging alone does not supply the reference's tailored cloth behaviour or production surface detail.
