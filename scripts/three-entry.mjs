/* Ingresso per il pacchetto Three.js dell'intro.
   Esporta solo ciò che usano assets/intro.js e assets/products.js, come oggetto globale THREE.
   Rigenera con: npm install && npm run vendor:three */
export {
  ACESFilmicToneMapping, AdditiveBlending, BufferGeometry, CanvasTexture, Color, DirectionalLight,
  DoubleSide, ExtrudeGeometry, Group, Line, LineBasicMaterial, LineDashedMaterial, LineSegments,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, PMREMGenerator, PerspectiveCamera, PlaneGeometry,
  PointLight, SRGBColorSpace, Scene, Vector3, WebGLRenderer, REVISION,
  /* pagina prodotti: ologrammi */
  BoxGeometry, CylinderGeometry, SphereGeometry, EdgesGeometry, Shape, Points, PointsMaterial,
  Float32BufferAttribute, LineLoop, Raycaster, Vector2
} from 'three';
export { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
export { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
