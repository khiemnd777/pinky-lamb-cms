// Browser modules share pure contracts; server/tool modules stay outside that graph.
import {builtinModules} from 'node:module';
const builtins=[...new Set(builtinModules.flatMap(name=>[name,`node:${name.replace(/^node:/,'')}`]))];
const builtinSuffixPattern=`^(${builtins.filter(name=>!name.startsWith('node:')).map(name=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replaceAll('/','\\u002f')).join('|')})[?#]`;
const message='Browser contracts and UI must use authorized API data, not private/server modules.';
const privateMediaRule={meta:{type:'problem',schema:[],messages:{private:'Private media/tool/cache imports must stay outside browser modules.'}},create(context){
  const inspect=node=>{
    if(node?.type!=='Literal' || typeof node.value!=='string')return;
    let value=node.value;
    try{for(let i=0;i<4;i++){const next=decodeURIComponent(value);if(next===value)break;value=next;}if(/%[0-9a-f]{2}/i.test(value))throw new Error('encoding');}catch{context.report({node,messageId:'private'});return;}
    value=value.replaceAll('\\','/').replace(/[?#].*$/,'').toLowerCase();
    if(/(?:^|\/)(?:media-tool-lock\.json|media-fixtures\.json|\.local|quarantine|private|media-cache|media-scratch|infra-local)(?:\/|$)/.test(value))context.report({node,messageId:'private'});
  };
  return {ImportDeclaration:node=>inspect(node.source),ExportNamedDeclaration:node=>inspect(node.source),ExportAllDeclaration:node=>inspect(node.source),ImportExpression:node=>inspect(node.source)};
}};

export default [
 {ignores:['node_modules/**','.local/**','public-baseline/**','admin-dist/**','.preview-output/**']},
 {files:['**/*.mjs'],languageOptions:{ecmaVersion:2024,sourceType:'module'},rules:{'no-unused-vars':['error',{argsIgnorePattern:'^_',caughtErrors:'none'}],'no-constant-condition':'error','no-unreachable':'error','no-dupe-keys':'error','constructor-super':'error','valid-typeof':'error','no-unsafe-finally':'error'}},
 {files:['admin/**/*.mjs','preview/**/*.mjs','contracts/**/*.mjs'],plugins:{'pinky-media':{rules:{'private-imports':privateMediaRule}}},rules:{
  'pinky-media/private-imports':'error',
  'no-restricted-imports':['error',{paths:builtins.map(name=>({name,message})),patterns:[{group:['**/cms-api/**','**/scripts/**','**/legacy-assets.json*','**/baseline-site.json*','**/baseline-provenance.json*','node:*'],message},{regex:builtinSuffixPattern,caseSensitive:true,message}]}],
  'no-restricted-syntax':['error',
   ...builtins.map(name=>({selector:`ImportExpression[source.value='${name}']`,message})),
   {selector:'ImportExpression[source.value=/^(node:)/]',message},
   {selector:`ImportExpression[source.value=/${builtinSuffixPattern}/]`,message},
   {selector:'ImportExpression[source.value=/(cms-api|scripts|legacy-assets\\.json|baseline-site\\.json|baseline-provenance\\.json)/]',message},
   {selector:"ImportExpression[source.type!='Literal']",message:'Browser dynamic imports require a fixed public module path.'}
  ]
 }}
];
