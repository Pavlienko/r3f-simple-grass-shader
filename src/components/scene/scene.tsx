import { useTexture, Plane, useGLTF, Sky, Effects } from "@react-three/drei";
import {
  Canvas,
  extend,
  ReactThreeFiber,
  useFrame,
  useThree,
} from "@react-three/fiber";
import { Suspense, useRef, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Perf } from "r3f-perf";
import { GLTF, ShaderPass, FXAAShader, SSAOShader } from "three-stdlib";
import { MainShader } from "../shaders/mainShader";
import { GroundShader } from "../shaders/groundShader";
import grassModel from "../../assets/grass.glb";
import grassTex from "../../assets/grass-new.png";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      mainShader: ReactThreeFiber.Object3DNode<
        THREE.ShaderMaterial,
        typeof MainShader
      >;
      groundShader: ReactThreeFiber.Object3DNode<
        THREE.ShaderMaterial,
        typeof GroundShader
      >;
      orbitControls: ReactThreeFiber.Object3DNode<
        OrbitControls,
        typeof OrbitControls
      >;
      shaderPass: ReactThreeFiber.Node<ShaderPass, typeof ShaderPass>;
    }
  }
}

type FieldProps = {
  count: number;
};

type GLTFResult = GLTF & {
  nodes: {
    grass: THREE.Mesh;
  };
  materials: {};
};

useGLTF.preload(grassModel);

extend({ MainShader });
extend({ GroundShader });
extend({ OrbitControls });
extend({ ShaderPass });

function Controls() {
  const controls = useRef<OrbitControls>(null!);
  const { camera, gl } = useThree();
  useFrame(() => (controls.current ? controls.current.update() : undefined));
  return (
    <orbitControls
      ref={controls}
      args={[camera, gl.domElement]}
      enableDamping
      dampingFactor={0.1}
      rotateSpeed={0.5}
    />
  );
}

const Field: React.FC<FieldProps> = ({ count }: FieldProps) => {
  const fieldRef = useRef<THREE.InstancedMesh>(null!);
  const shaderRef = useRef<THREE.ShaderMaterial>(null!);

  const { offsetArray } = useMemo(() => {
    const arr = new Array(count).fill(0);
    return {
      offsetArray: Float32Array.from(
        arr.flatMap((_, i) => [
          THREE.MathUtils.randFloat(-10, 10),
          0,
          THREE.MathUtils.randFloat(-10, 10),
        ])
      ),
    };
  }, [count]);

  const { rotationArray } = useMemo(() => {
    const arr = new Array(count).fill(0);
    return {
      rotationArray: Float32Array.from(
        arr.flatMap((_, i) => [THREE.MathUtils.randFloat(0, Math.PI * 2)])
      ),
    };
  }, [count]);

  const [grassTexture] = useTexture([grassTex]);

  const { nodes } = useGLTF(grassModel) as unknown as GLTFResult;
  const geometry = useMemo(() => {
    return nodes.grass.geometry;
  }, [nodes]);

  const uniforms = useMemo(
    () => ({
      uTime: {
        type: "f",
        value: 1.0,
      },
      uTexture: {
        type: "t",
        value: grassTexture,
      },
    }),
    [grassTexture]
  );

  useFrame(() => {
    shaderRef.current.uniforms.uTime.value += 0.1;
  });

  return (
    <instancedMesh
      ref={fieldRef}
      args={[undefined, undefined, count]}
      rotation-x={Math.PI}
      position={[0, 2, 0]}
    >
      <primitive object={geometry} attach="geometry">
        <instancedBufferAttribute
          attach="attributes-offset"
          args={[offsetArray, 3]}
        />
        <instancedBufferAttribute
          attach="attributes-rotation"
          args={[rotationArray, 1]}
        />
      </primitive>
      <mainShader
        ref={shaderRef}
        side={THREE.DoubleSide}
        uniforms={uniforms}
        transparent
      />
    </instancedMesh>
  );
};

let fxaa = FXAAShader;

fxaa.uniforms.resolution.value = new THREE.Vector2(
  1 / window.innerWidth,
  1 / window.innerHeight
);

const Scene: React.FC = () => {
  return (
    <div>
      <Canvas
        // dpr={[1, 2]}
        // gl={{antialias: false}}
        style={{ width: "100vw", height: "100vh" }}
        camera={{ position: [12, 17, -12], fov: 35 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ReinhardToneMapping;
        }}
      >
        <Controls />
        <Sky distance={450000} sunPosition={[0, 1, 0]} />
        <Suspense fallback={null}>
          <ambientLight intensity={1} />
          <Plane args={[21.2, 21.2, 1, 1]} rotation-x={-Math.PI / 2}>
            <groundShader />
          </Plane>
          <Field count={700} />
        </Suspense>
        <Perf showGraph={false} />
        <Effects multisamping={64} disableGamma>
          <shaderPass args={[fxaa]} />
        </Effects>
      </Canvas>
    </div>
  );
};

export default Scene;
