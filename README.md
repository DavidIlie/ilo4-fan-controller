# Modded ILO4 Fan Controller for Gen 8 HP Servers

<p align="center">
  <img width="400" src="readme/showcase.png">
  <br>
  <i>Freely manage your HP's fan speeds; anywhere, any time!</i>
</p>

---

## How this works

-   When you first load the page, a function runs through the [Next.js](https://nextjs.org/) `getServerSideProps` function which fetches the current data about the fan speeds of the server. This is then parsed and displayed on the `HTML` form, allowing you to have even 20 fans if you want as its all dynmaically created.

-   Once you either apply the settings, or select a preset, the server connects via SSH to ILO4 and then runs the required commands, normally it takes about 10-20 seconds for all the comamnds to run through, but the more fans you have the longer it will take.

## Important Information

-   There is **no authorization system** put in place, if you plan to expose this publicly, you must use some sort of authentication proxy such as [Authelia](https://github.com/authelia/authelia) which I have a guide for Kubernetes [here](https://github.com/DavidIlie/kubernetes-setup/tree/master/8%20-%20authelia). It wouldn't be fun for someone to put your server fans at 100% whilst you're not home.

## Installation

> The main requirement is that your ILO4 firmware is flashed with the _["The Fan Hack"](https://www.reddit.com/r/homelab/comments/hix44v/silence_of_the_fans_pt_2_hp_ilo_4_273_now_with/)_ mod.

## Docker

This resposity contains a docker image which can easily be pulled down to use in a Docker/Kubernetes environment. Modify the comamnd below with **your** values regarding your setup and then you can run the command:

```shell
docker run -d \
  --name=ilo4-fan-controller \
  -p 3000:3000 \
  -e ILO_USERNAME='*your username*' \
  -e ILO_PASSWORD='*your password**' \
  -e ILO_HOST='*the ip address you access ILO on*' \
  --restart unless-stopped \
  ghcr.io/davidilie/ilo4-fan-controller:latest
```

You can modify this to work with Rancher, Portainer, etc.

## Directly with node

On your desired machine, clone down the repository and make a copy of the `.env.template` into `.env` and fill in **your** values.

```env
ILO_HOST=x.x.x.x.x
ILO_USERNAME=iasbdliyasiyasd
ILO_PASSWORD=aosdubaiusldbaisdbiasd
```

Before you do anything you first need to build the project:

```shell
# fetches the dependencies
yarn

# builds the nextjs project
yarn build
```

You can then create a `systemd` service, use `pm2`, or just run it directly:

```shell
yarn start
```

## The Idea

HP offers enterprise servers which are normally supposed to be in some sort of datacenter environment, where things such as fan speed are not really a concern. With this in mind, when old HPE servers are decommissioned and put on the used market, people like myself buy these servers to have them part of our _Home Datacenter_.

These servers can easily start sounding like an airplane is starting to take off at your house, so modified firmwares of the server's IPMI system (ILO4) have been created in order to manage the fan speeds via SSH, but when your power goes off and you need to change the fan speed from your phone, that's a whole different story. I am sure there are already countless alternatives which do the same thing, but I decided to create my own so that I can make it as customizable as possible and not have it restricted to some models.
