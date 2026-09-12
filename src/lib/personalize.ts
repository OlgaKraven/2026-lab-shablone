import type {SubjectArea} from '../types'
export function personalizeText(value:string,_labNumber:number,area:SubjectArea){return value.replaceAll('{system}',area.title)}
