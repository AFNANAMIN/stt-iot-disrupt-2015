
FROM centos:centos6  
RUN curl -sL https://rpm.nodesource.com/setup | bash -  
RUN yum install -y nodejs  #
# Define working directory.
COPY ./ /src/
WORKDIR /src

RUN npm install
RUN npm build

EXPOSE 3000 8020

# Define default command.
CMD ["npm", "start"]
