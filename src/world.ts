import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STATIONS, type GameState } from './simulation';

type Marker = {id:string;x:number;y:number;visible:boolean};
export class Apartment {
  renderer:THREE.WebGLRenderer; scene=new THREE.Scene(); camera:THREE.OrthographicCamera;
  root=new THREE.Group(); hamid=new THREE.Group(); limbs:THREE.Group[]=[];
  cats:{root:THREE.Group;tail:THREE.Mesh;seed:number}[]=[];
  rings=new Map<string,THREE.Mesh>(); lamps:THREE.Mesh[]=[]; dust:THREE.Points;
  width=1;height=1; resizeObserver:ResizeObserver; low=false; disposed=false;
  mats=new Map<string,THREE.MeshStandardMaterial>(); clock=0; reduced=false;
  constructor(public canvas:HTMLCanvasElement){
    this.low=window.matchMedia('(pointer: coarse)').matches;
    this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:!this.low,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,this.low?1.5:2));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.scene.background=new THREE.Color('#153739');this.scene.fog=new THREE.Fog('#153739',45,85);
    this.camera=new THREE.OrthographicCamera(-15,15,10,-10,0.1,100);
    this.camera.position.set(18,23,24);this.camera.lookAt(0,0,0);
    this.scene.add(this.root);
    this.scene.add(new THREE.HemisphereLight('#b9e4e8','#75513d',2.6));
    const sun=new THREE.DirectionalLight('#ffddad',4.4);sun.position.set(8,15,-6);sun.castShadow=true;
    sun.shadow.mapSize.set(this.low?1024:2048,this.low?1024:2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:14,bottom:-14,near:0.1,far:50});sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.045;this.scene.add(sun);
    const fill=new THREE.DirectionalLight('#9bdeeb',1);fill.position.set(-10,5,10);this.scene.add(fill);
    this.buildApartment();this.batchStaticGeometry();this.buildHamid();this.buildCat('#db8a3f',0);this.buildCat('#e9d7bb',1);this.buildCat('#343c41',2);
    const dustPositions=new Float32Array(80*3);for(let i=0;i<80;i++){dustPositions[i*3]=Math.sin(i*7.1)*10;dustPositions[i*3+1]=0.7+(i%17)/4;dustPositions[i*3+2]=Math.cos(i*5.7)*7;}
    const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
    this.dust=new THREE.Points(dg,new THREE.PointsMaterial({color:'#ffe1ae',size:0.035,transparent:true,opacity:.45,depthWrite:false}));this.scene.add(this.dust);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
  }
  mat(color:string,roughness=.75,metalness=0){const key=`${color}:${roughness}:${metalness}`;let m=this.mats.get(key);if(!m){m=new THREE.MeshStandardMaterial({color,roughness,metalness});this.mats.set(key,m);}return m;}
  batchStaticGeometry(){
    this.root.updateMatrixWorld(true);const groups=new Map<THREE.Material,THREE.BufferGeometry[]>(),remove:THREE.Mesh[]=[];
    this.root.traverse(obj=>{if(!(obj instanceof THREE.Mesh)||obj instanceof THREE.InstancedMesh||this.lamps.includes(obj)||Array.from(this.rings.values()).includes(obj)||Array.isArray(obj.material))return;
      const geometry=obj.geometry.clone().applyMatrix4(obj.matrixWorld);const list=groups.get(obj.material)??[];list.push(geometry);groups.set(obj.material,list);remove.push(obj);
    });
    for(const [material,geometries] of groups){const geometry=mergeGeometries(geometries,false);if(geometry){const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);}geometries.forEach(g=>g.dispose());}
    remove.forEach(obj=>{obj.removeFromParent();obj.geometry.dispose();});
  }
  box(parent:THREE.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,color:string,r=.06){
    const mesh=new THREE.Mesh(r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d),this.mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  ball(parent:THREE.Object3D,r:number,x:number,y:number,z:number,color:string,sx=1,sy=1,sz=1){const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),this.mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;parent.add(m);return m;}
  cyl(parent:THREE.Object3D,r:number,h:number,x:number,y:number,z:number,color:string,rt=r){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,r,h,20),this.mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  rod(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,r:number,color:string){const d=new THREE.Vector3().subVectors(b,a);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),10),this.mat(color));m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m;}
  plant(x:number,z:number,size=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(size);this.root.add(g);this.cyl(g,.3,.52,0,.26,0,'#c77855',.36);this.cyl(g,.29,.04,0,.53,0,'#3d332a');for(let i=0;i<7;i++){const a=i*2.4;const leaf=this.ball(g,.25,Math.sin(a)*.3,.75+(i%3)*.22,Math.cos(a)*.3,i%2?'#417958':'#67945f',.6,1.9,.7);leaf.rotation.z=Math.sin(a)*.6;}}
  buildApartment(){
    const g=this.root;
    this.box(g,20,.7,13,0,-.52,0,'#102e30',.22);
    this.box(g,18,.25,12,0,-.13,0,'#b88052',.1);
    // Individually tinted, instanced parquet has detail without hundreds of draw calls.
    const geo=new THREE.BoxGeometry(.88,.025,2.98);const boards=new THREE.InstancedMesh(geo,this.mat('#c59461'),80);const dummy=new THREE.Object3D();let k=0;
    for(let x=0;x<20;x++)for(let z=0;z<4;z++){dummy.position.set(-8.55+x*.9,.013,-4.5+z*3);dummy.updateMatrix();boards.setMatrixAt(k,dummy.matrix);boards.setColorAt(k,new THREE.Color().setHSL(.087+(k%4)*.005,.36,.43+(k%7)*.025));k++;}
    boards.receiveShadow=true;g.add(boards);
    // Back and left walls leave the camera-facing sides open like a dollhouse.
    this.box(g,15,.14,.12,-1.4,.2,-5.94,'#e8d5b0');
    this.box(g,14.8,3.5,.22,-1.6,1.75,-6,'#dfcba9');this.box(g,.22,3.5,12,-9,1.75,0,'#bec4ae');
    this.box(g,14.9,.17,.12,-1.6,.2,-5.82,'#a47b5d');this.box(g,.12,.17,12,-8.82,.2,0,'#a47b5d');
    this.box(g,14.9,.15,.3,-1.6,3.5,-6,'#f0d9b2');
    // Kitchen tile inset and balcony deck.
    this.box(g,5.4,.035,4.3,3.2,.035,-3.8,'#67958c',0);
    for(let x=0;x<9;x++)for(let z=0;z<7;z++){this.box(g,.014,.006,.59,.7+x*.6,.059,-5.55+z*.6,'#aac1ad',0);this.box(g,.59,.006,.014,.7+x*.6,.06,-5.55+z*.6,'#aac1ad',0);}
    this.box(g,.2,2.9,3.2,5.85,1.45,-4.5,'#d7c4a3');
    this.box(g,3.0,.05,9.8,7.4,.06,-1,'#9a8870',0);
    for(let z=0;z<15;z++)this.box(g,3,.017,.025,7.4,.1,-5.65+z*.68,'#6c6d5e',0);
    for(let z=0;z<11;z++)this.box(g,.07,1.15,.07,8.91,.65,-5.6+z*1.04,'#263f42',.01);
    this.box(g,.1,.11,11,8.91,1.28,-.4,'#274146');this.box(g,3.1,.1,.1,7.4,1.28,-5.85,'#274146');
    // Workstation. Twin terminals, keyboards, coffee and a blinking mainframe rack.
    this.box(g,4.4,.16,1.5,-6,1.15,-5,'#78472f');for(const x of [-7.8,-4.2])this.box(g,.17,1.1,1.1,x,.56,-5,'#333e40');
    for(const x of [-7,-5.4]){this.box(g,1.32,.94,.62,x,1.74,-5.15,'#cbc8ad',.12);this.box(g,1.05,.65,.04,x,1.78,-4.819,'#092b2c',.02);for(let i=0;i<5;i++){const line=this.box(g,.52+(i%2)*.3,.025,.018,x-.08,1.98-i*.11,-4.788,'#64d9ad',0);line.material=new THREE.MeshStandardMaterial({color:'#54d79e',emissive:'#32b680',emissiveIntensity:1.4});}this.box(g,1.1,.075,.38,x,1.27,-4.55,'#d4c7a9');for(let j=0;j<10;j++)this.box(g,.06,.035,.22,x-.45+j*.1,1.32,-4.55,'#595e54',.01);}
    this.cyl(g,.14,.28,-4.3,1.37,-4.9,'#dc9850');
    this.box(g,1.15,2.6,1.1,-8.18,1.3,-4.8,'#303f43');for(let i=0;i<7;i++){this.box(g,.95,.26,.05,-8.18,.3+i*.31,-4.22,'#62716c');const l=this.ball(g,.037,-7.86,.3+i*.31,-4.17,'#8de4a6');this.lamps.push(l);}
    this.box(g,1.05,.2,.95,-5.85,.57,-3.7,'#3a6b65');this.box(g,1.05,.95,.2,-5.85,1.03,-4.12,'#3a6b65');this.cyl(g,.08,.45,-5.85,.26,-3.7,'#404c4c');
    // A framed, abstract terminal print.
    this.box(g,2,.95,.1,-5.8,2.92,-5.8,'#694c35');this.box(g,1.8,.75,.03,-5.8,2.92,-5.73,'#183a3a');
    for(let i=0;i<3;i++)this.box(g,1.2-i*.2,.05,.02,-5.9,3.1-i*.16,-5.7,'#78b7a1');
    // Kitchen cabinetry, sink and little hob.
    this.box(g,3.6,1.05,1.3,3.6,.52,-5.15,'#2f7775');this.box(g,3.8,.14,1.4,3.6,1.12,-5.15,'#e4dac0');
    for(let i=0;i<3;i++){this.box(g,1.02,.82,.04,2.45+i*1.15,.55,-4.478,'#3e8881');this.box(g,.32,.055,.07,2.45+i*1.15,.8,-4.43,'#cfba86');}
    this.box(g,1.1,.05,.83,2.6,1.205,-5.1,'#93a9a0');this.box(g,.84,.05,.62,2.6,1.23,-5.1,'#335d63');this.rod(g,new THREE.Vector3(2.7,1.2,-5.5),new THREE.Vector3(2.7,1.6,-5.5),.045,'#b2bab0');this.rod(g,new THREE.Vector3(2.7,1.6,-5.5),new THREE.Vector3(2.7,1.6,-5.2),.045,'#b2bab0');
    for(let i=0;i<2;i++)this.cyl(g,.23,.03,4.4,1.22,-5.4+i*.55,'#2d3c3b');
    this.box(g,2.8,.6,.5,3.5,2.8,-5.65,'#69958c');this.plant(5.2,-3.3,.85);
    // Cartoon breaker cabinet. No actual electrical wiring.
    this.box(g,1.05,1.4,.26,.4,1.8,-5.65,'#5b6764');this.box(g,.87,1.19,.05,.4,1.8,-5.49,'#c5cdb5');
    for(let i=0;i<4;i++)this.box(g,.16,.31,.1,.08+i*.21,1.83,-5.41,['#f6cb68','#76bcb0','#e7a17e','#86a0a8'][i]);
    // Feeding station with three bowls and an implausibly big bag of kibble.
    this.box(g,2.1,.04,.95,3.1,.09,-3.25,'#d4a168');for(let i=0;i<3;i++){this.cyl(g,.27,.18,2.45+i*.66,.2,-3.25,['#e9b963','#8dbac1','#ca837c'][i],.32);this.cyl(g,.25,.04,2.45+i*.66,.3,-3.25,'#815035');for(let k=0;k<5;k++)this.ball(g,.047,2.45+i*.66+Math.sin(k*4)*.15,.33,-3.25+Math.cos(k*4)*.15,'#bb874c');}
    this.box(g,.58,.9,.42,4.8,.47,-4.2,'#d39a65');this.box(g,.39,.34,.03,4.8,.57,-3.974,'#e3ccb0');
    // Living room rug, comfortable sofa, cushions and phone table.
    this.box(g,7,.028,5.5,-4.3,.06,2.8,'#d09a66',.08);this.box(g,6.5,.01,5,-4.3,.08,2.8,'#a2644d',.03);
    for(let i=0;i<6;i++){this.box(g,6,.008,.055,-4.3,.09,.65+i*.84,'#d9b485',0);}this.box(g,5.85,.01,3.7,-4.3,.1,2.8,'#ba7956');
    this.box(g,4.65,.45,1.55,-6,.58,4.5,'#c78049',.18);this.box(g,4.65,1.1,.36,-6,1.2,5.14,'#d4955f',.16);
    for(const x of [-8.1,-3.9])this.box(g,.38,.83,1.62,x,1,4.5,'#c78a51',.16);
    for(let i=0;i<3;i++)this.box(g,1.19,.23,1.15,-7.35+i*1.35,.93,4.4,'#e0a268',.11);
    const cushion=this.box(g,.7,.65,.23,-7.5,1.36,4.87,'#476f6a',.15);cushion.rotation.z=.15;this.box(g,.8,.64,.25,-4.7,1.35,4.9,'#edc48c',.16);
    this.box(g,1.9,.13,1.3,-3.2,.61,2.5,'#875534',.15);for(const x of [-3.9,-2.5])for(const z of [2.04,2.96])this.box(g,.09,.52,.09,x,.29,z,'#414943');
    this.box(g,.59,.045,.42,-3.35,.71,2.4,'#8fa999');this.cyl(g,.14,.15,-2.74,.76,2.62,'#edd3a4');
    this.cyl(g,.55,.11,-7.8,.88,1.9,'#b58655');this.cyl(g,.09,.8,-7.8,.41,1.9,'#4b5047');this.cyl(g,.39,.07,-7.8,.06,1.9,'#4b5047');
    const phone=this.box(g,.57,.16,.44,-7.8,1,1.9,'#ce5686',.07);phone.rotation.y=.2;this.box(g,.69,.12,.17,-7.8,1.16,1.89,'#ed83a5',.075);this.cyl(g,.12,.025,-7.8,1.095,2.01,'#634657');
    // Story corner. A reading chair and an overconfident pile of books.
    this.box(g,2.7,.66,1.13,1,.35,5,'#446e65',.12);this.box(g,2.7,1.12,.25,1,1.05,5.46,'#537e70',.12);
    for(let i=0;i<5;i++)this.box(g,.48,.1,.7,2.4,.1+i*.11,3.8,['#ba805c','#768e74','#d3b982'][i%3]);
    this.plant(-8.1,-1.1,1.4);this.plant(3.95,4.7,1.3);this.plant(7.8,-4.5,1.2);this.plant(7.7,3.7,1.4);
    // Articulated balcony ladder and flower shelf.
    const ladder=new THREE.Group();ladder.position.set(7.7,0,-2.1);ladder.rotation.z=-.06;g.add(ladder);
    for(const x of [-.38,.38]){this.rod(ladder,new THREE.Vector3(x,0,.46),new THREE.Vector3(x,2.8,-.12),.06,'#c6c3a4');this.rod(ladder,new THREE.Vector3(x,0,-.75),new THREE.Vector3(x,2.8,-.12),.05,'#abb2a3');}
    for(let i=0;i<7;i++)this.box(ladder,.89,.09,.14,0,.3+i*.36,.4-i*.077,'#d0c9aa');
    this.box(g,1.2,.12,.55,7.5,1.25,-5.65,'#c28f5e');
    // Brass standing lamp.
    this.cyl(g,.35,.08,-8,.12,4.3,'#454c40');this.cyl(g,.035,2.8,-8,1.52,4.3,'#b5a278');this.cyl(g,.52,.62,-8,2.95,4.3,'#ead3a0',.25);
    const lamp=new THREE.PointLight('#ffb457',7,5,2);lamp.position.set(-8,2.4,4.3);g.add(lamp);
    // Front cutaway edge is a deliberate miniature presentation.
    this.box(g,18,.19,.2,0,-.05,6,'#8a684b');this.box(g,.2,.19,12,-9,-.05,0,'#8a684b');
    for(const station of STATIONS){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.69,.033,8,48),new THREE.MeshBasicMaterial({color:station.color,transparent:true,opacity:.9}));ring.rotation.x=-Math.PI/2;ring.position.set(station.x,.15,station.z);g.add(ring);this.rings.set(station.id,ring);
    }
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),this.mat('#153739'));ground.rotation.x=-Math.PI/2;ground.position.y=-.94;ground.receiveShadow=true;this.scene.add(ground);
  }
  buildHamid(){
    const p=this.hamid;this.root.add(p);
    // Freely moving, jointed game model based on the blue-sweater reference.
    this.ball(p,.4,0,1.02,0,'#417fa5',1,.98,.68);
    this.box(p,.66,.15,.47,0,.69,0,'#376a8d',.07);
    this.cyl(p,.16,.18,0,1.39,0,'#c48d69');
    this.ball(p,.335,0,1.74,.015,'#dbab85',.98,1.13,.91);
    this.ball(p,.074,-.326,1.72,.02,'#c89475',.6,1,1);this.ball(p,.074,.326,1.72,.02,'#c89475',.6,1,1);
    this.ball(p,.1,0,1.7,.31,'#d3a07a',.72,.9,.95);
    for(const x of [-.3,.3])this.ball(p,.125,x,1.82,-.04,'#9e9d91',.4,1.0,1.55);
    // Rectangle spectacles with transparent-looking pale blue lenses.
    for(const x of [-.155,.155]){
      this.box(p,.257,.176,.045,x,1.79,.304,'#253d43',.034);
      this.box(p,.196,.116,.022,x,1.79,.333,'#bad5d4',.023);
      this.ball(p,.036,x,1.79,.35,'#24383b',1,1,.3);
      this.box(p,.09,.018,.025,x-.035,1.823,.35,'#e4f3e5',.006);
      this.box(p,.2,.037,.025,x,1.908,.245,'#807467',.015);
    }
    this.box(p,.078,.036,.04,0,1.81,.335,'#253d43',.01);
    this.box(p,.14,.03,.022,0,1.57,.283,'#f3e8cf',.012);
    for(const x of [-.13,.13]){const collar=this.box(p,.19,.23,.065,x,1.34,.218,'#f4e9cd',.02);collar.rotation.z=x>0?-.35:.35;}
    for(const side of [-1,1]){
      const arm=new THREE.Group();arm.position.set(side*.39,1.21,0);p.add(arm);this.ball(arm,.17,side*.025,-.21,0,'#4483a9',.82,1.8,.9);this.ball(arm,.105,side*.05,-.5,.04,'#d3a27e',.9,1.3,1);this.limbs.push(arm);
      const leg=new THREE.Group();leg.position.set(side*.17,.66,0);p.add(leg);this.box(leg,.22,.49,.24,0,-.24,0,'#35444b',.075);this.box(leg,.27,.15,.4,0,-.52,.095,'#735842',.06);this.limbs.push(leg);
    }
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.43,32),new THREE.MeshBasicMaterial({color:'#112c2d',transparent:true,opacity:.22,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;p.add(shadow);
    const indicator=new THREE.Mesh(new THREE.TorusGeometry(.43,.022,6,40),new THREE.MeshBasicMaterial({color:'#fff2ac'}));indicator.rotation.x=-Math.PI/2;indicator.position.y=.04;p.add(indicator);
    p.scale.setScalar(1.05);
  }
  buildCat(color:string,seed:number){
    const g=new THREE.Group();this.root.add(g);this.ball(g,.38,0,.38,0,color,1.3,1,1.65);
    this.ball(g,.3,0,.64,.45,color,1.07,.9,.85);this.ball(g,.19,0,.57,.59,'#ecdec3',1.1,.64,.5);
    for(const x of [-.2,.2]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.12,.25,3),this.mat(color));ear.position.set(x,.92,.41);ear.rotation.y=Math.PI;g.add(ear);this.ball(g,.062,x*.61,.69,.69,'#d7db81',1,.8,.3);this.ball(g,.028,x*.61,.69,.708,'#2c352c',.4,1,.3);this.ball(g,.12,x,.14,.35,color,1,.8,1.4);}
    this.ball(g,.04,0,.61,.734,'#c47d78');
    const tail=this.cyl(g,.065,.8,.1,.52,-.66,color);tail.rotation.x=-.8;
    if(seed===1)this.ball(g,.22,0,.33,.39,'#eee2ca',1.2,1.3,.6);
    this.cats.push({root:g,tail,seed});
  }
  resize(){
    const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;if(!r.width||!r.height)return;
    this.renderer.setSize(r.width,r.height,false);const aspect=r.width/r.height;
    const viewWidth=aspect<.8?25.5:aspect<1.2?27:32.5;const viewHeight=Math.max(18.2,viewWidth/aspect);
    this.camera.left=-viewHeight*aspect/2;this.camera.right=viewHeight*aspect/2;this.camera.top=viewHeight/2;this.camera.bottom=-viewHeight/2;this.camera.updateProjectionMatrix();
  }
  update(s:GameState,dt:number,animate=true):Marker[]{
    if(this.disposed)return [];if(animate)this.clock+=dt;
    const t=this.clock,p=s.player;this.hamid.position.set(p.x,.08+(p.moving&&animate?Math.abs(Math.sin(t*12))*.055:0),p.z);
    let diff=p.angle-this.hamid.rotation.y;diff=Math.atan2(Math.sin(diff),Math.cos(diff));this.hamid.rotation.y+=diff*Math.min(1,dt*15);
    this.limbs.forEach((limb,i)=>limb.rotation.x=p.moving&&animate?Math.sin(t*12+(i<2?0:Math.PI))*(i%2?.55:.35):Math.sin(t*2+i)*.035);
    this.cats.forEach(({root,tail,seed})=>{const a=t*.15+seed*2.1;const x=1.5+Math.sin(a)*2.2,z=-.15+Math.cos(a*.87)*1.6;root.position.set(x,.06,z);root.rotation.y=Math.atan2(Math.cos(a),-Math.sin(a*.87));tail.rotation.z=Math.sin(t*2.5+seed)*.22;});
    this.lamps.forEach((l,i)=>{(l.material as THREE.MeshStandardMaterial).emissive.set(i%3===Math.floor(t*2)%3?'#53e897':'#163a27');});
    this.dust.visible=!this.reduced;this.dust.rotation.y=t*.013;
    for(const st of STATIONS){const task=s.tasks.find(v=>v.station===st.id),ring=this.rings.get(st.id)!;ring.visible=!!task;ring.scale.setScalar(1+(!this.reduced&&task?.urgent?Math.sin(t*6)*.07:0));}
    this.renderer.render(this.scene,this.camera);
    return STATIONS.map(st=>{const v=new THREE.Vector3(st.x,2.75,st.z).project(this.camera);return{id:st.id,x:(v.x*.5+.5)*this.width,y:(-v.y*.5+.5)*this.height,visible:!!s.tasks.find(t=>t.station===st.id)};});
  }
  dispose(){this.disposed=true;this.resizeObserver.disconnect();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();this.scene.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Points){geometries.add(obj.geometry);(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.renderer.dispose();}
}
