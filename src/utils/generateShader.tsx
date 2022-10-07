import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import guid from 'short-uuid'

export function generateShader(name:any, vertex:any, fragment:any) {
  const shader = shaderMaterial({ uTime: 1 }, vertex, fragment);
  shader.key = guid.generate();
  extend({ [name]: shader });
  return shader
}