declare module 'shapefile' {
  export function open(filePath: string): any;
  export function openDbf(filePath: string): any;
  export function openShp(filePath: string): any;
  export function read(filePath: string): any;

  const shapefile: any;
  export default shapefile;
}
