server {
	server_name myconet.chickenkiller.com www.myconet.chickenkiller.com;

	root /var/www/myconet-html;
	index index.html index.htm;

	# Node API proxy
	location /api/ {
		proxy_pass ; 
		proxy_set_header Host $host;
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	}

	location /profilePictures/ {
		alias /var/www/myconet-api/profilePictures/;
		expires 30d;
		add_header Cache-Control "public, no-transform";
	}

	location = / {
		proxy_pass ; 
		proxy_set_header Host $host;
	}

	#Serve protected HTML pages through Node
	location ~ ^/(index\.html|profile\.html)$ {
		proxy_pass ; 
		proxy_set_header Host $host;
	}

	location / {
	try_files $uri $uri/ =404;
	}

	listen 443 ssl; # managed by Certbot
	ssl_certificate /etc/letsencrypt/live/myconet.chickenkiller.com/fullchain.pem; # managed by Certbot
	ssl_certificate_key /etc/letsencrypt/live/myconet.chickenkiller.com/privkey.pem; # managed by Certbot
	include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
	ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
	if ($host = myconet.chickenkiller.com) {
		return 301 https://$host$request_uri;
	} # managed by Certbot


	listen 80;
	server_name myconet.chickenkiller.com www.myconet.chickenkiller.com;
	return 404; # managed by Certbot
}
