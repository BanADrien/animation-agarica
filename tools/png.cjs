const fs=require('node:fs'),zlib=require('node:zlib');
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let c=0xffffffff;for(const x of b)c=table[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),len=Buffer.alloc(4),sum=Buffer.alloc(4);len.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([len,t,data,sum]);}
function read(path){const b=fs.readFileSync(path);let at=8,w,h,type,depth,blocks=[];while(at<b.length){let n=b.readUInt32BE(at),t=b.toString('ascii',at+4,at+8),d=b.subarray(at+8,at+8+n);if(t==='IHDR'){w=d.readUInt32BE(0);h=d.readUInt32BE(4);depth=d[8];type=d[9];if(d[12])throw Error('Interlaced PNG unsupported');}if(t==='IDAT')blocks.push(d);at+=n+12;}
 if(depth!==8||![2,6].includes(type))throw Error('Expected RGB/RGBA 8 bit PNG');let channels=type===6?4:3,stride=w*channels,raw=zlib.inflateSync(Buffer.concat(blocks)),unfiltered=Buffer.alloc(stride*h),p=0;
 for(let y=0;y<h;y++){let f=raw[p++];for(let x=0;x<stride;x++){let a=x>=channels?unfiltered[y*stride+x-channels]:0,b=y?unfiltered[(y-1)*stride+x]:0,c=y&&x>=channels?unfiltered[(y-1)*stride+x-channels]:0,v=0;if(f===1)v=a;if(f===2)v=b;if(f===3)v=Math.floor((a+b)/2);if(f===4){let q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);v=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}unfiltered[y*stride+x]=(raw[p++]+v)&255;}}
 const data=Buffer.alloc(w*h*4);for(let i=0;i<w*h;i++){unfiltered.copy(data,i*4,i*channels,i*channels+channels);if(channels===3)data[i*4+3]=255;}return{w,h,data};}
function write(path,im){let header=Buffer.alloc(13);header.writeUInt32BE(im.w,0);header.writeUInt32BE(im.h,4);header[8]=8;header[9]=6;let rows=Buffer.alloc(im.h*(im.w*4+1));for(let y=0;y<im.h;y++)im.data.copy(rows,y*(im.w*4+1)+1,y*im.w*4,(y+1)*im.w*4);fs.writeFileSync(path,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));}
function blank(w,h){return{w,h,data:Buffer.alloc(w*h*4)};}
module.exports={read,write,blank};
