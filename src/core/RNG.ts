// Mulberry32，可種子化
export class RNG {
private s: number
constructor(seed = 123456789) { this.s = seed >>> 0 }
next() { let t = (this.s += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
int(min:number, max:number){ return Math.floor(this.next()*(max-min+1))+min }
pick<T>(arr:T[]):T{ return arr[Math.floor(this.next()*arr.length)] }
}