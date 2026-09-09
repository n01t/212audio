const listings=[
["Science is just magic","Jack Smith","5597465",false],
["A test","Jack Smith","90584471",false],
["EDU-C","Chester Mccray","11061596",false],
["HIS2","Chester Mccray","96132803",false],
["A","Md Maidul Islam","91495716",false],
["Yeet","Md Maidul Islam","40313774",false],
["AAAAAA","Md Maidul Islam","64993234",false],
["More Test","Md Maidul Islam","72768313",false],
["Audio Test","Md Maidul Islam","37359629",false],
["ANOther Test","Md Maidul Islam","40028525",false],
["LTE promo 2","Jhone Doe","84657606",true],
["ET","Chester Mccray","94472454",false],
["Edu 2","Chester Mccray","41146869",false],
["Edu 1","Chester Mccray","9983299",false],
["F04","Chester Mccray","82568042",false],
["General Meeting","Chester Mccray","7604155",false],
["Live Show","Chester Mccray","29323896",false],
["LTE promo","Jhone Doe","4285756",true]
];
const cards=document.querySelector("#cards");
cards.innerHTML=listings.map((x,i)=>`<article class="card"><div class="card-image">${x[3]?'<img src="assets/lte-promo-reference.jpg" alt="">':'No Image'}</div><div class="card-body"><h3>${x[0]}</h3><p>by ${x[1]}</p><div class="program-id">Program ID:<b>${x[2]}</b></div></div></article>`).join("");
function tick(){const d=new Date();document.querySelector("#clock").textContent=d.toLocaleTimeString("en-US",{hour12:true})}tick();setInterval(tick,1000);