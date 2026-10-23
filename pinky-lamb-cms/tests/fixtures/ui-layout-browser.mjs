import {mountFileSources} from '../../admin/file-sources.mjs';
import {mountMediaUpload} from '../../admin/media-upload.mjs';
import {mountMediaLibrary} from '../../admin/media-library.mjs';
import {openMediaSlotPicker} from '../../admin/media-slot-picker.mjs';
import {createSiteFieldTools} from '../../admin/site-settings-editor.mjs';
import {createWebsitePublicationPreparation} from '../../admin/website-publication-preparation.mjs';
const getSession=()=>({uid:'layout-fixture-owner',role:'OWNER',authzVersion:1});
const item={id:'fixture-video',name:'Tài nguyên dài dùng kiểm tra xuống dòng 日本語の長い名前 English content',kind:'VIDEO',status:'QUEUED',revision:0,canArchive:true,createdAtMs:1,width:null,height:null,isArchived:false,derivative:null};
const root=document.getElementById('fixture'),mode=new URL(location.href).searchParams.get('mode')??'upload';
const writes=document.createElement('output');writes.id='fixture-write-count';writes.hidden=true;writes.value='0';document.body.append(writes);const apiFetch=async(path,options={})=>{if(options.method&&options.method!=='GET'){writes.value=String(Number(writes.value)+1);throw Error('Fixture denies writes');}if(path.includes('/media?'))return {items:path.includes('kind=VIDEO')?[item]:[],nextCursor:null};if(path.includes('/files'))throw Error('Synthetic file load error');return {items:[],nextCursor:null};};
if(mode==='upload')mountMediaUpload(root,{apiFetch,getSession});
if(mode==='files')mountFileSources(root,{apiFetch,getSession});
if(mode==='library')mountMediaLibrary(root,{apiFetch:async path=>path.includes('/files')?{items:[],nextCursor:null}:apiFetch(path),getSession});
if(mode==='picker')openMediaSlotPicker({apiFetch,getSession,kind:'PDF',onSelect(){}});
if(mode==='heading'){
 const tools=createSiteFieldTools({content:{},context:{siteUx:true,formSorts:true,catalog:[]},onChange(){},redraw(){}});
 tools.heading(root,{lines:[[{text:'Một tiêu đề dài để kiểm tra bố cục 日本語 English'}],[{text:'Dòng thứ hai'}]]},'fixture.heading','fixture-heading','Tiêu đề');
}
if(mode==='publication'){
 const preparation=createWebsitePublicationPreparation(root,{apiFetch:async()=>{throw Error('Synthetic preparation error');},getSession,labelResource:()=>'',onConfirm(){throw Error('Writes forbidden');}});
 void preparation.prepare({});
}

if(mode==='field'){
 const tools=createSiteFieldTools({content:{sections:[],settings:{credential:{assetId:'fixture-file'}}},context:{siteUx:true,catalog:[],fileSources:{apiFetch,getSession}},onChange(){},redraw(){}});
 tools.action(root,{kind:'FILE',assetId:'fixture-file',label:'Tài liệu'},'fixture.action','fixture-action','Tài liệu',()=>{});
}
