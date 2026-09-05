import {test} from 'node:test';
import assert from 'node:assert/strict';
import {graphicsProfile,renderPixelRatio} from '../src/graphics.ts';

test('high-DPR phones keep a bounded drawing buffer and no dynamic shadow pass',()=>{
  const profile=graphicsProfile(true);
  assert.equal(profile.shadows,false);assert.equal(profile.lightweight,true);assert.equal(profile.frameInterval,1000/30);
  for(const [width,height] of [[390,650],[844,390],[1280,900],[3840,2160]]){
    const ratio=renderPixelRatio(width,height,4,profile);
    assert.ok(ratio<=1&&ratio>0);assert.ok(width*height*ratio*ratio<=profile.pixelBudget+1e-6);
  }
});
test('recovery selects a smaller pixel budget on desktop and phone',()=>{
  for(const touch of [true,false]){const profile=graphicsProfile(touch,true);assert.equal(profile.name,'safe');assert.equal(profile.shadows,false);assert.ok(profile.pixelBudget<graphicsProfile(touch).pixelBudget);}
});
test('desktop preserves high quality within a finite GPU pixel budget',()=>{
  const profile=graphicsProfile(false);assert.equal(profile.shadows,true);assert.equal(profile.frameInterval,1000/60);
  const ratio=renderPixelRatio(3840,2160,3,profile);assert.ok(3840*2160*ratio*ratio<=2_000_000+1e-6);
  assert.equal(renderPixelRatio(800,600,NaN,profile),1);
});
